<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { usePalStore } from '@/stores/palStore'
import { useOwnedStore } from '@/stores/ownedStore'
import { useUiStore } from '@/stores/uiStore'
import PalAutocomplete from '@/components/PalAutocomplete.vue'
import OwnedPanel from '@/components/OwnedPanel.vue'
import ReversePanel from '@/components/ReversePanel.vue'
import PathPanel from '@/components/PathPanel.vue'

const palStore = usePalStore()
const ownedStore = useOwnedStore()
const uiStore = useUiStore()

// ============ Toast ============
const toastMsg = ref('')
const toastVisible = ref(false)
let toastTimer = null
function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastVisible.value = false), 2600)
}

// ============ 面板展开状态 ============
const ownedExpanded = ref(false)
const reverseExpanded = ref(false)
const pathExpanded = ref(false)
const reversePanelRef = ref(null)

// ============ 父母输入 ============
const parentA = ref('')
const parentB = ref('')
const palA = ref(null)
const palB = ref(null)

// ============ 结果 ============
const currentResult = ref(null)
const showResult = ref(false)
const errorMsg = ref('')
const isRevealed = ref(false)

const childPal = computed(() =>
  currentResult.value ? palStore.palByCode.get(currentResult.value.child) : null
)
const isChildOwned = computed(() =>
  childPal.value ? ownedStore.has(childPal.value.code) : false
)

// 每次结果变化，重置揭示状态（已拥有 → 直接揭示）
watch(currentResult, () => {
  if (!currentResult.value) return
  isRevealed.value = isChildOwned.value
})

// ============ 查询 ============
function query() {
  errorMsg.value = ''
  showResult.value = false

  const nameA = parentA.value.trim()
  const nameB = parentB.value.trim()
  if (!nameA || !nameB) {
    errorMsg.value = '请输入父母双方的帕鲁名称。'
    return
  }

  const ra = palA.value ? { pal: palA.value, matches: [] } : palStore.resolvePal(nameA)
  const rb = palB.value ? { pal: palB.value, matches: [] } : palStore.resolvePal(nameB)

  if (!ra.pal || !rb.pal) {
    const missing = !ra.pal ? nameA : nameB
    const matches = (!ra.pal ? ra : rb).matches
      .slice(0, 5)
      .map(p => palStore.cnOf(p.code))
    errorMsg.value =
      `未识别到「${missing}」` +
      (matches.length
        ? `，你是不是想找：${matches.join('、')}？`
        : '，请从自动补全列表中选择。')
    return
  }

  let r
  try {
    r = palStore.engine.breed(ra.pal.code, rb.pal.code)
  } catch (e) {
    errorMsg.value = '计算出错：' + e.message
    return
  }

  if (!palStore.palByCode.get(r.child)) {
    errorMsg.value = `引擎返回了未知的子代 code: ${r.child}`
    return
  }

  currentResult.value = { ...r, ra, rb }
  showResult.value = true
}

// ============ 换位 ============
function swapParents() {
  ;[parentA.value, parentB.value] = [parentB.value, parentA.value]
  ;[palA.value, palB.value] = [palB.value, palA.value]
  if (showResult.value) query()
}

// ============ 揭示 / 加入已拥有 ============
function reveal() {
  if (!currentResult.value) return
  const cn = palStore.cnOf(currentResult.value.child)
  const ok = confirm(
    `确定要查看子代结果吗？\n\n` +
    `一旦查看，本次查询结果将不再隐藏。\n` +
    `（提示：若想保持挑战感，可以先把它加入「已拥有」再查询）`
  )
  if (!ok) return
  isRevealed.value = true
  showToast(`已揭示：${cn}`)
}

function addChildToOwned() {
  if (!childPal.value) return
  if (ownedStore.has(childPal.value.code)) return
  ownedStore.add(childPal.value.code)
  isRevealed.value = true
  showToast(`已加入：${palStore.cnOf(childPal.value.code)}`)
}

// ============ 结果显示相关 ============
const kindInfo = computed(() => {
  const map = {
    rank:        ['按繁殖力公式', 'kind-rank'],
    unique:      ['固定唯一配方', 'kind-unique'],
    directional: ['方向性配方', 'kind-directional'],
    identity:    ['同种自交', 'kind-identity'],
  }
  const k = currentResult.value?.kind
  return map[k] || [k || '', 'kind-rank']
})

const resultMeta = computed(() => {
  const r = currentResult.value
  if (!r) return ''
  const cnA = palStore.cnOf(r.ra.pal.code)
  const cnB = palStore.cnOf(r.rb.pal.code)
  let meta = `父母：${cnA} + ${cnB}`
  if (r.kind === 'unique') meta += '　|　命中固定唯一配方'
  else if (r.kind === 'identity') meta += '　|　同种自交，子代与父母相同'
  else if (r.kind === 'directional') meta += '　|　方向性配方，孩子取决于哪一方是雄性'
  return meta
})

const child2Text = computed(() => {
  const r = currentResult.value
  if (!r?.child2) return ''
  const c2 = palStore.palByCode.get(r.child2)
  if (!c2) return ''
  return `另一性别结果：${palStore.cnOf(c2.code)}（${c2.name}）`
})

// ============ 路径面板 → 反查面板 ============
function onReverseFromPath(pal) {
  reverseExpanded.value = true
  nextTick(() => {
    reversePanelRef.value?.doReverse(pal, true)
  })
}
</script>

<template>
  <div class="card">
    <h1>计算器</h1>
    <p class="subtitle">输入父母，计算子代（基于 palworld-mcp 的 dataset.json）</p>

    <!-- 父母输入 -->
    <div class="parents-wrap">
      <div class="field">
        <label>父本 / 母本 A</label>
        <PalAutocomplete
          v-model="parentA"
          placeholder="输入中文名 / 英文名，如 棉悠悠 / Lamball"
          @select="p => (palA = p)"
        />
      </div>

      <div class="field">
        <label>父本 / 母本 B</label>
        <div class="input-with-btn">
          <PalAutocomplete
            v-model="parentB"
            placeholder="输入中文名 / 英文名，如 捣蛋猫 / Cattiva"
            @select="p => (palB = p)"
          />
          <button
            type="button"
            class="swap-btn"
            title="父母换位"
            @click="swapParents"
          >⇅</button>
        </div>
      </div>
    </div>

    <button @click="query">查 询 子 代</button>

    <div v-if="errorMsg" class="error show">{{ errorMsg }}</div>

    <!-- 结果 -->
    <div v-if="showResult && currentResult" class="result show">
      <div>
        <span class="kind-badge" :class="kindInfo[1]">{{ kindInfo[0] }}</span>
        <span
          class="owned-badge"
          :class="isChildOwned ? 'owned-yes' : 'owned-no'"
        >{{ isChildOwned ? '已拥有' : '未拥有' }}</span>
      </div>

      <div class="label">子代帕鲁</div>

      <!-- 隐藏态 -->
      <template v-if="!isRevealed">
        <div class="child-name hidden-child">？？？</div>
        <div class="child-en"></div>
        <div class="meta">{{ resultMeta }}</div>
        <div class="hidden-hint">该子代尚未拥有，结果已隐藏。</div>
        <button class="reveal-btn" type="button" @click="reveal">点击查看</button>
      </template>

      <!-- 显示态 -->
      <template v-else>
        <div class="child-name">
          <img
            v-if="uiStore.showIcons && childPal"
            class="child-icon"
            :src="palStore.iconUrl(childPal.code)"
            :alt="palStore.cnOf(childPal.code)"
            @error="e => (e.target.style.display = 'none')"
          />
          <span>{{ palStore.cnOf(childPal.code) }}</span>
        </div>
        <div class="child-en">{{ childPal.name }} · {{ childPal.code }}</div>

        <button
          v-if="!isChildOwned"
          class="add-owned-btn"
          type="button"
          @click="addChildToOwned"
        >加入已拥有</button>
        <button
          v-else
          class="add-owned-btn owned"
          type="button"
          disabled
        >已拥有 ✓</button>

        <div v-if="child2Text" class="child2-name">{{ child2Text }}</div>
        <div class="meta">{{ resultMeta }}</div>
      </template>
    </div>

    <!-- 已拥有面板 -->
    <OwnedPanel
      v-model:expanded="ownedExpanded"
      @toast="showToast"
    />

    <!-- 反查面板 -->
    <ReversePanel
      ref="reversePanelRef"
      v-model:expanded="reverseExpanded"
      @toast="showToast"
    />

    <!-- 最短路线面板 -->
    <PathPanel
      v-model:expanded="pathExpanded"
      @toast="showToast"
      @reverse="onReverseFromPath"
    />

    <p class="note">
      算法：方向性配方 → 唯一固定配方 → 同种自交 → 繁殖力公式。
      数据来自 palworld-mcp 的 dataset.json（v1.0.3）。
    </p>
  </div>

  <!-- Toast -->
  <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
</template>