<script setup>
import { ref, computed } from 'vue'
import { usePalStore } from '@/stores/palStore'
import { useOwnedStore } from '@/stores/ownedStore'
import { useUiStore } from '@/stores/uiStore'
import PalDetailModal from '@/components/PalDetailModal.vue'


const palStore = usePalStore()
const ownedStore = useOwnedStore()
const uiStore = useUiStore()

// ============ 状态 ============
const keyword = ref('')
const filterMode = ref('all')  // all | owned | missing
const elementFilter = ref(new Set())
const workFilter = ref(new Set())
const sortMode = ref('deck')   // deck | cn | rank

// ============ 工具函数 ============
function deckOrder(p) {
  const d = p.deck || ''
  const m = d.match(/^(\d+)([A-Z]*)$/)
  if (m) return [parseInt(m[1], 10), m[2]]
  return [9999, d]
}
function cmpDeck(a, b) {
  const [na, sa] = deckOrder(a)
  const [nb, sb] = deckOrder(b)
  if (na !== nb) return na - nb
  return sa.localeCompare(sb)
}
function cmpCn(a, b) {
  return palStore.cnOf(a.code).localeCompare(palStore.cnOf(b.code), 'zh-CN')
}
function cmpRank(a, b) {
  return (a.rank ?? 9999) - (b.rank ?? 9999)
}

// ============ 筛选结果 ============
const filtered = computed(() => {
  const q = keyword.value.trim()
  const ql = q.toLowerCase()
  let list = palStore.pals.slice()

  if (q) {
    list = list.filter(p => {
      const cn = palStore.cnNameMap[p.code] || ''
      return (
        cn.includes(q) ||
        p.name.toLowerCase().includes(ql) ||
        p.code.toLowerCase().includes(ql)
      )
    })
  }

  if (filterMode.value === 'owned') {
    list = list.filter(p => ownedStore.has(p.code))
  } else if (filterMode.value === 'missing') {
    list = list.filter(p => !ownedStore.has(p.code))
  }

  if (elementFilter.value.size > 0) {
    list = list.filter(p => {
      for (const e of p.element || []) if (elementFilter.value.has(e)) return true
      return false
    })
  }

  if (workFilter.value.size > 0) {
    list = list.filter(p => {
      for (const w of p.workSuitability || []) if (workFilter.value.has(w.work)) return true
      return false
    })
  }

  if (sortMode.value === 'cn') list.sort(cmpCn)
  else if (sortMode.value === 'rank') list.sort(cmpRank)
  else list.sort(cmpDeck)

  return list
})

const totalCount = computed(() => palStore.pals.length)
const ownedCount = computed(() => ownedStore.count)
const ownedPercent = computed(() =>
  totalCount.value ? Math.round((ownedCount.value / totalCount.value) * 100) : 0
)

// ============ 操作 ============
function toggleElement(key) {
  const s = new Set(elementFilter.value)
  s.has(key) ? s.delete(key) : s.add(key)
  elementFilter.value = s
}
function toggleWork(key) {
  const s = new Set(workFilter.value)
  s.has(key) ? s.delete(key) : s.add(key)
  workFilter.value = s
}
function clearFilters() {
  keyword.value = ''
  filterMode.value = 'all'
  elementFilter.value = new Set()
  workFilter.value = new Set()
  sortMode.value = 'deck'
}

const hasAnyFilter = computed(() =>
  keyword.value.trim() !== '' ||
  filterMode.value !== 'all' ||
  elementFilter.value.size > 0 ||
  workFilter.value.size > 0
)

// ============ 详情弹窗 ============
const detailVisible = ref(false)
const detailPal = ref(null)

function openDetail(p) {
  detailPal.value = p
  detailVisible.value = true
}
</script>

<template>
  <div class="card paldex-card">
    <h1>帕鲁图鉴</h1>
    <p class="subtitle">
      共 {{ totalCount }} 只 · 已拥有 {{ ownedCount }} 只（{{ ownedPercent }}%）
    </p>

    <div class="paldex-toolbar">
      <input type="text" v-model="keyword" placeholder="搜索中文名 / 英文名 / code …" />
      <div class="paldex-filter">
        <button :class="{ active: filterMode === 'all' }" @click="filterMode = 'all'">全部</button>
        <button :class="{ active: filterMode === 'owned' }" @click="filterMode = 'owned'">已拥有</button>
        <button :class="{ active: filterMode === 'missing' }" @click="filterMode = 'missing'">未拥有</button>
      </div>
    </div>

    <!-- 属性 -->
    <div class="paldex-filter-row">
      <span class="paldex-filter-label">属性</span>
      <div class="paldex-filter-chips">
        <button v-for="e in palStore.availableElements" :key="e" :class="{ active: elementFilter.has(e) }"
          @click="toggleElement(e)">{{ palStore.elementCn(e) }}</button>
      </div>
    </div>

    <!-- 工作适性 -->
    <div class="paldex-filter-row">
      <span class="paldex-filter-label">工作</span>
      <div class="paldex-filter-chips">
        <button v-for="w in palStore.availableWorks" :key="w" :class="{ active: workFilter.has(w) }"
          @click="toggleWork(w)">{{ palStore.workCn(w) }}</button>
      </div>
    </div>

    <!-- 排序 -->
    <div class="paldex-filter-row">
      <span class="paldex-filter-label">排序</span>
      <div class="paldex-filter-chips">
        <button :class="{ active: sortMode === 'deck' }" @click="sortMode = 'deck'">图鉴顺序</button>
        <button :class="{ active: sortMode === 'cn' }" @click="sortMode = 'cn'">中文名</button>
        <button :class="{ active: sortMode === 'rank' }" @click="sortMode = 'rank'">繁殖力</button>
        <button v-if="hasAnyFilter" class="clear-btn" @click="clearFilters">清除筛选</button>
      </div>
    </div>

    <div class="paldex-count">匹配 {{ filtered.length }} 只</div>

    <div v-if="filtered.length === 0" class="paldex-empty">
      没有匹配的帕鲁。
    </div>

    <div v-else class="paldex-grid">
      <div v-for="p in filtered" :key="p.code" class="paldex-item" :class="{
        owned: ownedStore.has(p.code),
        'no-icon': !uiStore.showIcons
      }" @click="openDetail(p)" title="点击查看详情">
        <span v-if="ownedStore.has(p.code)" class="paldex-owned-badge">✓</span>

        <img v-if="uiStore.showIcons" class="paldex-icon" :src="palStore.iconUrl(p.code)" :alt="palStore.cnOf(p.code)"
          @error="e => (e.target.style.display = 'none')" />

        <div class="paldex-cn">{{ palStore.cnOf(p.code) }}</div>
        <div class="paldex-en">{{ p.name }}</div>

        <div class="paldex-tags">
          <span v-for="e in p.element || []" :key="e" class="paldex-tag paldex-tag-el">{{ palStore.elementCn(e)
          }}</span>
        </div>

        <div class="paldex-deck" v-if="p.deck">#{{ p.deck }}</div>
      </div>
    </div>


    <!-- 详情弹窗 -->
    <PalDetailModal v-model:visible="detailVisible" :pal="detailPal" />
  </div>
</template>



<style scoped>
.paldex-card {
  max-width: 1080px;
}

/* ---------- 顶部工具栏 ---------- */
.paldex-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.paldex-toolbar input[type="text"] {
  flex: 1;
  min-width: 180px;
}

.paldex-filter {
  display: flex;
  gap: 4px;
}

.paldex-filter button {
  width: auto;
  flex: 0 0 auto;
  margin: 0;
  padding: 9px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #a0a0a8;
  letter-spacing: 0;
}

.paldex-filter button:hover {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.paldex-filter button.active {
  background: rgba(120, 170, 140, 0.18);
  color: #9cc8a8;
}

/* ---------- 筛选行 ---------- */
.paldex-filter-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.paldex-filter-label {
  font-size: 0.78rem;
  color: #7c7c84;
  min-width: 32px;
  padding-top: 7px;
  flex-shrink: 0;
}

.paldex-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.paldex-filter-chips button {
  width: auto;
  flex: 0 0 auto;
  margin: 0;
  padding: 6px 11px;
  font-size: 0.76rem;
  font-weight: 500;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: #a0a0a8;
  letter-spacing: 0;
}

.paldex-filter-chips button:hover {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.paldex-filter-chips button.active {
  background: rgba(120, 170, 140, 0.18);
  color: #9cc8a8;
}

.paldex-filter-chips .clear-btn {
  background: rgba(180, 110, 110, 0.14);
  color: #d09a9a;
}

.paldex-filter-chips .clear-btn:hover {
  background: rgba(180, 110, 110, 0.24);
}

.paldex-count {
  font-size: 0.75rem;
  color: #7c7c84;
  margin: 4px 0 14px;
}

.paldex-empty {
  padding: 40px 0;
  text-align: center;
  color: #7c7c84;
  font-size: 0.9rem;
}

/* ---------- 网格 ---------- */
.paldex-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.paldex-item {
  position: relative;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 10px 10px;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.paldex-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.paldex-item.owned {
  border-color: rgba(120, 170, 140, 0.28);
  background: rgba(120, 170, 140, 0.08);
}

.paldex-owned-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #8ab89a;
  color: #141416;
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.paldex-icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin: 0 auto 8px;
  display: block;
}

/* 不显示图片时：减少顶部内边距，让文字上移 */
.paldex-item.no-icon {
  padding-top: 16px;
}

.paldex-cn {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e6e6ea;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paldex-en {
  font-size: 0.7rem;
  color: #6c6c74;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paldex-deck {
  font-size: 0.7rem;
  color: #5c5c64;
  margin-top: 4px;
}

.paldex-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  margin-top: 6px;
}

.paldex-tag {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #a0a0a8;
}

.paldex-tag-el {
  background: rgba(120, 140, 180, 0.16);
  color: #a8b8d0;
}
</style>