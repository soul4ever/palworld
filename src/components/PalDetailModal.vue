<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { usePalStore } from '@/stores/palStore'
import { useOwnedStore } from '@/stores/ownedStore'
import { useUiStore } from '@/stores/uiStore'

const palStore = usePalStore()
const ownedStore = useOwnedStore()
const uiStore = useUiStore()

const props = defineProps({
  pal: { type: Object, default: null },
})
const visible = defineModel('visible', { type: Boolean, default: false })

const dialogRef = ref(null)

const isOwned = computed(() =>
  props.pal ? ownedStore.has(props.pal.code) : false
)

// 打开/关闭 -> 同步 <dialog>
watch(visible, async (v) => {
  const el = dialogRef.value
  if (!el) return
  if (v) {
    if (!el.open) el.showModal()
  } else {
    if (el.open) el.close()
  }
})

// 用户按 Esc / 点遮罩 关闭 dialog 时，同步 visible
function onDialogClose() {
  visible.value = false
}

// 点击 backdrop 关闭（点击 dialog 元素本身，而不是内容）
function onDialogClick(e) {
  if (e.target === dialogRef.value) {
    dialogRef.value.close()
  }
}

function close() {
  dialogRef.value?.close()
}

function toggleOwned() {
  if (!props.pal) return
  ownedStore.toggle(props.pal.code)
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="pal-dialog"
    @close="onDialogClose"
    @click="onDialogClick"
  >
    <div v-if="pal" class="pal-detail">
      <!-- 顶部：图标 + 名字 + 关闭 -->
      <header class="pd-header">
        <img
          v-if="uiStore.showIcons"
          class="pd-icon"
          :src="palStore.iconUrl(pal.code)"
          :alt="palStore.cnOf(pal.code)"
          @error="e => (e.target.style.visibility = 'hidden')"
        />
        <div class="pd-titles">
          <h2 class="pd-cn">
            {{ palStore.cnOf(pal.code) }}
            <span v-if="pal.deck" class="pd-deck">#{{ pal.deck }}</span>
          </h2>
          <p class="pd-en">{{ pal.name }}<span v-if="pal.code !== pal.name"> · {{ pal.code }}</span></p>
          <div class="pd-tags">
            <span
              v-for="e in pal.element || []"
              :key="e"
              class="pd-tag pd-tag-el"
            >{{ palStore.elementCn(e) }}</span>
            <span v-if="pal.size" class="pd-tag">体型 {{ pal.size }}</span>
            <span v-if="pal.rarity" class="pd-tag">稀有度 {{ pal.rarity }}</span>
            <span v-if="pal.genus" class="pd-tag">{{ pal.genus }}</span>
            <span v-if="pal.ignoreCombi" class="pd-tag pd-tag-warn">不参与配种</span>
          </div>
        </div>
        <button class="pd-close" type="button" @click="close" title="关闭">✕</button>
      </header>

      <!-- 基础数值 -->
      <section class="pd-section">
        <h3>基础数值</h3>
        <div class="pd-grid">
          <div class="pd-cell">
            <span class="pd-key">繁殖力</span>
            <span class="pd-val">{{ pal.rank ?? '—' }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">捕获率</span>
            <span class="pd-val">{{ pal.captureRate ?? '—' }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">雄性比例</span>
            <span class="pd-val">{{ pal.maleRatio != null ? pal.maleRatio + '%' : '—' }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">饥饿值</span>
            <span class="pd-val">{{ pal.food ?? '—' }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">工作速度</span>
            <span class="pd-val">{{ pal.workSpeed ?? '—' }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">体型</span>
            <span class="pd-val">{{ pal.size ?? '—' }}</span>
          </div>
        </div>
      </section>

      <!-- 三维 -->
      <section v-if="pal.stats" class="pd-section">
        <h3>基础三维</h3>
        <div class="pd-grid pd-grid-3">
          <div class="pd-cell">
            <span class="pd-key">HP</span>
            <span class="pd-val">{{ pal.stats.hp }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">攻击</span>
            <span class="pd-val">{{ pal.stats.attack }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">防御</span>
            <span class="pd-val">{{ pal.stats.defense }}</span>
          </div>
        </div>
      </section>

      <!-- 好感加成 -->
      <section v-if="pal.friendship" class="pd-section">
        <h3>好感加成</h3>
        <div class="pd-grid pd-grid-3">
          <div class="pd-cell">
            <span class="pd-key">HP</span>
            <span class="pd-val">{{ pal.friendship.hp }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">攻击</span>
            <span class="pd-val">{{ pal.friendship.attack }}</span>
          </div>
          <div class="pd-cell">
            <span class="pd-key">防御</span>
            <span class="pd-val">{{ pal.friendship.defense }}</span>
          </div>
        </div>
      </section>

      <!-- 工作适性 -->
      <section v-if="pal.workSuitability && pal.workSuitability.length" class="pd-section">
        <h3>工作适性</h3>
        <div class="pd-chips">
          <span
            v-for="w in pal.workSuitability"
            :key="w.work"
            class="pd-chip"
          >
            {{ palStore.workCn(w.work) }}
            <b>Lv.{{ w.level }}</b>
          </span>
        </div>
      </section>

      <!-- 伙伴技能 -->
      <section v-if="pal.partnerSkill" class="pd-section">
        <h3>伙伴技能</h3>
        <div class="pd-block">
          <div class="pd-block-title">{{ pal.partnerSkill.name }}</div>
          <div class="pd-block-body">{{ pal.partnerSkill.description }}</div>
        </div>
      </section>

      <!-- 主动技能 -->
      <section v-if="pal.activeSkills && pal.activeSkills.length" class="pd-section">
        <h3>主动技能</h3>
        <div class="pd-list">
          <div
            v-for="(s, i) in pal.activeSkills"
            :key="i"
            class="pd-list-row"
          >
            <span class="pd-list-lv">Lv.{{ s.level }}</span>
            <span class="pd-list-name">{{ s.name }}</span>
            <span class="pd-list-el pd-tag pd-tag-el">{{ palStore.skillElementCn(s.element) }}</span>
            <span class="pd-list-meta">CD {{ s.cooldown }}</span>
            <span class="pd-list-meta">威力 {{ s.power }}</span>
          </div>
        </div>
      </section>

      <!-- 掉落物 -->
      <section v-if="pal.drops && pal.drops.length" class="pd-section">
        <h3>掉落物</h3>
        <div class="pd-list">
          <div
            v-for="(d, i) in pal.drops"
            :key="i"
            class="pd-list-row"
          >
            <span class="pd-list-name">{{ d.item }}</span>
            <span class="pd-list-meta">×{{ d.qty }}</span>
            <span class="pd-list-meta">{{ d.probability }}</span>
          </div>
        </div>
      </section>

      <!-- 简介 -->
      <section v-if="pal.summary" class="pd-section">
        <h3>简介</h3>
        <p class="pd-summary">{{ pal.summary }}</p>
      </section>

      <!-- 底部操作 -->
      <footer class="pd-footer">
        <button
          class="pd-owned-btn"
          :class="{ owned: isOwned }"
          type="button"
          @click="toggleOwned"
        >
          {{ isOwned ? '已拥有 ✓（点击取消）' : '标记为已拥有' }}
        </button>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
/* ---------- dialog 本身 ---------- */
.pal-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #1a1a1e;
  color: #d8d8dc;
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.65);
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.pal-dialog[open] {
  opacity: 1;
  animation: pd-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.05);
}
.pal-dialog::backdrop {
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  animation: pd-backdrop 0.2s ease;
}
@keyframes pd-in {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes pd-backdrop {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ---------- 内部布局 ---------- */
.pal-detail {
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 22px 24px 18px;
}

.pd-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}
.pd-icon {
  width: 84px;
  height: 84px;
  object-fit: contain;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}
.pd-titles {
  flex: 1;
  min-width: 0;
}
.pd-cn {
  font-size: 1.35rem;
  font-weight: 800;
  color: #ececf0;
  letter-spacing: 0.01em;
  margin: 0 0 2px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.pd-deck {
  font-size: 0.75rem;
  color: #7c7c84;
  font-weight: 600;
}
.pd-en {
  font-size: 0.82rem;
  color: #7c7c84;
  margin: 0 0 8px;
  word-break: break-all;
}
.pd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.pd-tag {
  font-size: 0.68rem;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  color: #a0a0a8;
  letter-spacing: 0.02em;
}
.pd-tag-el {
  background: rgba(120, 140, 180, 0.16);
  color: #a8b8d0;
}
.pd-tag-warn {
  background: rgba(180, 130, 110, 0.16);
  color: #d0a898;
}
.pd-close {
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: #a0a0a8;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pd-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e6e6ea;
  box-shadow: none;
}

/* ---------- Section ---------- */
.pd-section {
  margin-bottom: 18px;
}
.pd-section h3 {
  font-size: 0.72rem;
  font-weight: 700;
  color: #7c7c84;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 8px;
}

.pd-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.pd-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.pd-cell {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pd-key {
  font-size: 0.68rem;
  color: #7c7c84;
  letter-spacing: 0.03em;
}
.pd-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e6e6ea;
}

/* ---------- 工作 chips ---------- */
.pd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.pd-chip {
  font-size: 0.75rem;
  padding: 4px 9px;
  border-radius: 7px;
  background: rgba(120, 170, 140, 0.1);
  color: #b8d8c4;
  border: 1px solid rgba(120, 170, 140, 0.18);
}
.pd-chip b {
  color: #8ab89a;
  font-weight: 800;
  margin-left: 4px;
}

/* ---------- 文本块 ---------- */
.pd-block {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px 12px;
}
.pd-block-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #e6e6ea;
  margin-bottom: 4px;
}
.pd-block-body {
  font-size: 0.8rem;
  color: #a0a0a8;
  line-height: 1.55;
}
.pd-summary {
  font-size: 0.82rem;
  color: #a0a0a8;
  line-height: 1.65;
  margin: 0;
}

/* ---------- 列表 ---------- */
.pd-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pd-list-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.8rem;
}
.pd-list-lv {
  font-size: 0.7rem;
  color: #7c7c84;
  font-weight: 700;
  min-width: 34px;
}
.pd-list-name {
  color: #e6e6ea;
  font-weight: 600;
  flex: 1;
  min-width: 100px;
}
.pd-list-el {
  font-size: 0.68rem;
}
.pd-list-meta {
  font-size: 0.72rem;
  color: #7c7c84;
}

/* ---------- 底部 ---------- */
.pd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 4px;
}
.pd-owned-btn {
  width: auto;
  margin: 0;
  padding: 9px 16px;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 10px;
  background: rgba(120, 170, 140, 0.14);
  color: #9cc8a8;
  letter-spacing: 0.02em;
}
.pd-owned-btn:hover {
  background: rgba(120, 170, 140, 0.24);
  box-shadow: none;
}
.pd-owned-btn.owned {
  background: rgba(255, 255, 255, 0.05);
  color: #7c7c84;
}
.pd-owned-btn.owned:hover {
  background: rgba(180, 110, 110, 0.14);
  color: #d09a9a;
}
</style>