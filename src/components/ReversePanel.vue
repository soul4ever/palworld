<script setup>
import { ref, computed } from 'vue'
import { usePalStore } from '@/stores/palStore'
import PalAutocomplete from '@/components/PalAutocomplete.vue'

const palStore = usePalStore()

const expanded = defineModel('expanded', { type: Boolean, default: false })
const emit = defineEmits(['toast'])

const inputText = ref('')
const inputPal = ref(null)      // 从自动补全选中的 pal
const result = ref(null)        // { unique, directional, identity, rank }
const reverseTarget = ref(null) // 当前反查的 pal
const history = ref([])         // 历史栈

function doReverse(target, recordHistory = true) {
  if (recordHistory && reverseTarget.value && reverseTarget.value.code !== target.code) {
    history.value.push(reverseTarget.value.code)
  }
  reverseTarget.value = target
  inputText.value = palStore.cnOf(target.code)
  inputPal.value = target

  // 计算
  const res = { unique: [], directional: [], identity: [], rank: [] }
  const pals = palStore.pals
  for (let i = 0; i < pals.length; i++) {
    for (let j = i; j < pals.length; j++) {
      const A = pals[i]
      const B = pals[j]
      let r
      try { r = palStore.engine.breed(A.code, B.code) } catch (e) { continue }
      const hitMain = r.child === target.code
      const hitSecond = r.child2 === target.code
      if (!hitMain && !hitSecond) continue
      const pair = { a: A, b: B, r }
      if (r.kind === 'unique') res.unique.push(pair)
      else if (r.kind === 'directional') res.directional.push(pair)
      else if (r.kind === 'identity') res.identity.push(pair)
      else res.rank.push(pair)
    }
  }
  result.value = res
}

function onQuery() {
  let target = inputPal.value
  if (!target) {
    const r = palStore.resolvePal(inputText.value.trim())
    target = r.pal
  }
  if (!target) {
    emit('toast', '未识别到目标帕鲁，请从自动补全中选择。')
    return
  }
  doReverse(target, true)
}

function goBack() {
  if (history.value.length === 0) return
  const prevCode = history.value.pop()
  const prevPal = palStore.palByCode.get(prevCode)
  if (!prevPal) return
  doReverse(prevPal, false)
}

function onPickParent(pal) {
  doReverse(pal, true)
}

const collapsed = ref({
  unique: true,
  directional: true,
  identity: true,
  rank: true,
})

function toggleGroup(key) {
  collapsed.value[key] = !collapsed.value[key]
}

const groups = computed(() => {
  if (!result.value) return []
  const target = reverseTarget.value.code
  return [
    { key: 'unique', label: '固定唯一配方', items: result.value.unique },
    { key: 'directional', label: '方向性配方', items: result.value.directional },
    { key: 'identity', label: '同种自交', items: result.value.identity },
    { key: 'rank', label: '按繁殖力公式', items: result.value.rank },
  ].filter(g => g.items.length > 0)
})

function noteFor(pair) {
  if (pair.r.kind !== 'directional') return ''
  return pair.r.child === reverseTarget.value.code
    ? '（A 为雄时出）'
    : '（B 为雄时出）'
}
</script>

<template>
  <div class="reverse-panel">
    <div class="reverse-header" @click="expanded = !expanded">
      <span>按子代查询</span>
      <span>{{ expanded ? '收起 ▴' : '展开 ▾' }}</span>
    </div>

    <div v-show="expanded" class="reverse-body">
      <div class="reverse-tools">
        <PalAutocomplete
          v-model="inputText"
          placeholder="输入要反查的子代（中文名 / 英文名）"
          @select="p => (inputPal = p)"
        />
        <button type="button" @click="onQuery">反查</button>
        <button
          type="button"
          class="back-btn"
          title="返回上一级"
          :disabled="history.length === 0"
          @click="goBack"
        >←</button>
      </div>

      <div v-if="result" class="reverse-result">
        <div v-if="groups.length === 0" class="rev-note">
          没有找到能生出「{{ palStore.cnOf(reverseTarget.code) }}」的父母组合。
        </div>

        <template v-for="g in groups" :key="g.key">
          <div
            class="rev-kind"
            :class="{ collapsed: collapsed[g.key] }"
            @click="toggleGroup(g.key)"
          >
            <span class="rev-arrow">▼</span>
            <span>{{ g.label }}（{{ g.items.length }}）</span>
          </div>
          <div class="rev-group" :class="{ collapsed: collapsed[g.key] }">
            <div v-for="(pair, idx) in g.items" :key="idx" class="rev-pair">
              <span
                class="rev-a rev-parent"
                :title="`点击反查「${palStore.cnOf(pair.a.code)}」`"
                @click="onPickParent(pair.a)"
              >{{ palStore.cnOf(pair.a.code) }}</span>
              <span class="rev-plus">+</span>
              <span
                class="rev-b rev-parent"
                :title="`点击反查「${palStore.cnOf(pair.b.code)}」`"
                @click="onPickParent(pair.b)"
              >{{ palStore.cnOf(pair.b.code) }}</span>
              <span v-if="noteFor(pair)" class="rev-note">{{ noteFor(pair) }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>