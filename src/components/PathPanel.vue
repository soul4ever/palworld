<script setup>
import { ref, computed } from 'vue'
import { usePalStore } from '@/stores/palStore'
import PalAutocomplete from '@/components/PalAutocomplete.vue'

const palStore = usePalStore()

const expanded = defineModel('expanded', { type: Boolean, default: false })
const emit = defineEmits(['toast', 'reverse'])

const MAX_DEPTH = 6

const startText = ref('')
const targetText = ref('')
const startPal = ref(null)
const targetPal = ref(null)

const result = ref(null)   // { ok, chain, startCode, targetCode }
const computing = ref(false)

// ---- 配种缓存 ----
let breedCache = null
function getBreedCache() {
  if (breedCache) return breedCache
  breedCache = new Map()
  for (const A of palStore.pals) {
    for (const B of palStore.pals) {
      if (A.code > B.code) continue
      const key = `${A.code}|${B.code}`
      let r
      try { r = palStore.engine.breed(A.code, B.code) } catch (e) { continue }
      breedCache.set(key, r)
    }
  }
  return breedCache
}

function findShortestBreedingChain(startCode, targetCode) {
  if (startCode === targetCode) return { ok: true, chain: [] }

  const visited = new Map()
  visited.set(startCode, null)
  const queue = [startCode]
  let head = 0

  while (head < queue.length) {
    const cur = queue[head++]

    // 计算深度
    let depth = 0
    let p = cur
    while (visited.get(p)) {
      depth++
      const s = visited.get(p)
      p = s.parents[0] === p ? s.parents[1] : s.parents[0]
    }
    if (depth >= MAX_DEPTH) continue

    for (const other of palStore.pals) {
      const a = cur < other.code ? cur : other.code
      const b = cur < other.code ? other.code : cur
      const key = `${a}|${b}`
      const r = getBreedCache().get(key)
      if (!r) continue

      const candidates = [r.child]
      if (r.child2 && r.child2 !== r.child) candidates.push(r.child2)

      for (const childCode of candidates) {
        if (visited.has(childCode)) continue
        const step = { parents: [a, b], child: childCode }
        visited.set(childCode, step)

        if (childCode === targetCode) {
          const chain = []
          let node = childCode
          while (visited.get(node)) {
            const s = visited.get(node)
            chain.unshift(s)
            node = s.parents[0] === node ? s.parents[1] : s.parents[0]
          }
          return { ok: true, chain }
        }
        queue.push(childCode)
      }
    }
  }
  return { ok: false, chain: null }
}

function onCompute() {
  let start = startPal.value
  let target = targetPal.value
  if (!start && startText.value.trim()) start = palStore.resolvePal(startText.value.trim()).pal
  if (!target && targetText.value.trim()) target = palStore.resolvePal(targetText.value.trim()).pal

  if (!start) { emit('toast', `未识别到起始帕鲁「${startText.value}」`); return }
  if (!target) { emit('toast', `未识别到目标帕鲁「${targetText.value}」`); return }

  computing.value = true
  setTimeout(() => {
    try {
      const res = findShortestBreedingChain(start.code, target.code)
      result.value = { ...res, startCode: start.code, targetCode: target.code }
    } catch (e) {
      emit('toast', '计算失败：' + e.message)
    } finally {
      computing.value = false
    }
  }, 0)
}

function onClickParent(code) {
  const pal = palStore.palByCode.get(code)
  if (!pal) return
  emit('reverse', pal)
}

const chainLines = computed(() => {
  if (!result.value?.ok) return []
  return result.value.chain.map((step, i) => ({
    idx: i + 1,
    a: step.parents[0],
    b: step.parents[1],
    c: step.child,
  }))
})
</script>

<template>
  <div class="path-panel">
    <div class="path-header" @click="expanded = !expanded">
      <span>最短配种路线</span>
      <span>{{ expanded ? '收起 ▴' : '展开 ▾' }}</span>
    </div>

    <div v-show="expanded" class="path-body">
      <div class="path-tools">
        <div class="path-input-wrap">
          <PalAutocomplete
            v-model="startText"
            placeholder="起始帕鲁（如 棉悠悠）"
            with-icon
            @select="p => (startPal = p)"
          />
        </div>
        <div class="path-input-wrap">
          <PalAutocomplete
            v-model="targetText"
            placeholder="目标帕鲁（如 焰煌）"
            with-icon
            @select="p => (targetPal = p)"
          />
        </div>
        <button type="button" :disabled="computing" @click="onCompute">
          {{ computing ? '计算中 …' : '计算路线' }}
        </button>
      </div>

      <div v-if="result" class="path-result">
        <template v-if="!result.ok">
          <div class="path-empty">
            无法通过配种从「{{ palStore.cnOf(result.startCode) }}」到达「{{ palStore.cnOf(result.targetCode) }}」。
            <div class="path-note">（已搜索 {{ MAX_DEPTH }} 代以内，仍未找到路线）</div>
          </div>
        </template>

        <template v-else-if="result.chain.length === 0">
          <div class="path-empty">起点和目标相同，无需配种。</div>
        </template>

        <template v-else>
          <div class="path-title">共 {{ result.chain.length }} 代：</div>
          <div v-for="line in chainLines" :key="line.idx" class="path-step">
            <span class="path-idx">{{ line.idx }}.</span>
            <span
              class="path-parent"
              :title="`点击反查「${palStore.cnOf(line.a)}」`"
              @click="onClickParent(line.a)"
            >{{ palStore.cnOf(line.a) }}</span>
            <span class="path-plus">+</span>
            <span
              class="path-parent"
              :title="`点击反查「${palStore.cnOf(line.b)}」`"
              @click="onClickParent(line.b)"
            >{{ palStore.cnOf(line.b) }}</span>
            <span class="path-arrow">→</span>
            <span class="path-child">{{ palStore.cnOf(line.c) }}</span>
          </div>
          <div class="path-note">提示：点击任意父母名可跳转到「按子代查询」面板。</div>
        </template>
      </div>
    </div>
  </div>
</template>