<script setup>
import { ref, computed } from 'vue'
import { usePalStore } from '@/stores/palStore'
import { useOwnedStore } from '@/stores/ownedStore'

const palStore = usePalStore()
const ownedStore = useOwnedStore()

const expanded = defineModel('expanded', { type: Boolean, default: false })

const search = ref('')
const importFile = ref(null)

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

const filteredPals = computed(() => {
  const q = search.value.trim()
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
  list.sort(cmpDeck)
  const checked = list.filter(p => ownedStore.has(p.code))
  const unchecked = list.filter(p => !ownedStore.has(p.code))
  return checked.concat(unchecked)
})

const allSelected = computed(() =>
  filteredPals.value.length > 0 &&
  filteredPals.value.every(p => ownedStore.has(p.code))
)

function selectAll() {
  const codes = filteredPals.value.map(p => p.code)
  if (allSelected.value) {
    const n = ownedStore.removeMany(codes)
    emitToast(`已取消选择 ${n} 只`)
  } else {
    const n = ownedStore.addMany(codes)
    emitToast(`已全选 ${n} 只`)
  }
}

function toggleItem(p) {
  ownedStore.toggle(p.code)
}

function clearAll() {
  if (ownedStore.count === 0) return
  if (!confirm('确定要清空所有已拥有的帕鲁吗？')) return
  ownedStore.clear()
  emitToast('已清空已拥有列表')
}

// 简易 toast（如果想用全局的，可以换成一个 store）
const emit = defineEmits(['toast'])
function emitToast(msg) { emit('toast', msg) }

function exportJSON() {
  const { count, fname } = ownedStore.exportJSON()
  emitToast(`已导出 ${count} 只帕鲁 → ${fname}`)
}

function triggerImport() {
  if (importFile.value) {
    importFile.value.value = ''
    importFile.value.click()
  }
}

function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const { valid, unknown } = ownedStore.parseImportFile(reader.result)
      if (valid.length === 0) {
        emitToast(`导入失败：没有识别到有效帕鲁${unknown.length ? `（${unknown.length} 个未知 code）` : ''}`)
        return
      }
      const merge = ownedStore.count > 0
        ? confirm(
            `当前已有 ${ownedStore.count} 只帕鲁。\n\n` +
            `点「确定」= 合并（保留现有 + 导入新增）\n` +
            `点「取消」= 覆盖（用文件内容替换现有）`
          )
        : true
      if (merge) {
        const n = ownedStore.addMany(valid)
        emitToast(`已合并导入：新增 ${n} 只，共 ${ownedStore.count} 只` +
          (unknown.length ? `（忽略未知 ${unknown.length} 个）` : ''))
      } else {
        ownedStore.replaceAll(valid)
        emitToast(`已覆盖导入：共 ${ownedStore.count} 只` +
          (unknown.length ? `（忽略未知 ${unknown.length} 个）` : ''))
      }
    } catch (err) {
      emitToast('导入失败：' + err.message)
    }
  }
  reader.onerror = () => emitToast('读取文件失败')
  reader.readAsText(file)
}
</script>

<template>
  <div class="owned-panel">
    <div class="owned-header" @click="expanded = !expanded">
      <span>已拥有的帕鲁 <span class="count">({{ ownedStore.count }})</span></span>
      <span>{{ expanded ? '收起 ▴' : '展开 ▾' }}</span>
    </div>

    <div v-show="expanded" class="owned-body">
      <div class="owned-tools">
        <input
          type="text"
          v-model="search"
          placeholder="搜索中文名 / 英文名 …"
        />
        <button type="button" @click="selectAll">
          {{ allSelected ? '取消全选' : '全选' }}
        </button>
      </div>

      <div class="owned-list">
        <div
          v-for="p in filteredPals"
          :key="p.code"
          class="owned-item"
          :class="{ checked: ownedStore.has(p.code) }"
          @click="toggleItem(p)"
        >
          <span class="box"></span>
          <span>
            <span class="oi-cn">
              <template v-if="p.deck">#{{ p.deck }} </template>{{ palStore.cnOf(p.code) }}
            </span><br>
            <span class="oi-en">{{ p.name }}</span>
          </span>
        </div>
      </div>

      <div class="io-bar">
        <button type="button" @click="exportJSON">导出 JSON</button>
        <button type="button" @click="triggerImport">导入 JSON</button>
        <button type="button" class="danger" @click="clearAll">清空</button>
      </div>
      <input
        ref="importFile"
        type="file"
        accept="application/json,.json"
        style="display:none;"
        @change="onImportFile"
      />
    </div>
  </div>
</template>