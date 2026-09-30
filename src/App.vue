<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { usePalStore } from '@/stores/palStore'
import { useOwnedStore } from '@/stores/ownedStore'
import { useUiStore } from '@/stores/uiStore'

const palStore = usePalStore()
const ownedStore = useOwnedStore()
const uiStore = useUiStore()

onMounted(() => {
  palStore.load()
  ownedStore.load()
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1 class="app-logo">帕鲁配种计算器</h1>
      <nav class="app-nav">
        <RouterLink to="/calculator">计算器</RouterLink>
        <RouterLink to="/paldex">图鉴</RouterLink>
      </nav>
      <label class="toggle">
        <input type="checkbox" v-model="uiStore.showIcons" />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-label">显示帕鲁图片</span>
      </label>
    </header>

    <main class="app-main">
      <div v-if="palStore.loading" class="loading">正在加载数据 …</div>
      <div v-else-if="palStore.error" class="loading" style="color:#d08a8a;">
        加载失败：{{ palStore.error }}
      </div>
      <RouterView v-else />
    </main>
  </div>
</template>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }
.app-header {
  display: flex; align-items: center; gap: 24px;
  padding: 14px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
}
.app-logo { font-size: 1rem; font-weight: 700; color: #e6e6ea; }
.app-nav { display: flex; gap: 4px; }
.app-nav a {
  padding: 6px 14px; border-radius: 8px;
  color: #a0a0a8; text-decoration: none; font-size: 0.88rem;
  transition: background .15s, color .15s;
}
.app-nav a:hover { background: rgba(255,255,255,0.05); color: #e6e6ea; }
.app-nav a.router-link-active { background: rgba(255,255,255,0.08); color: #e6e6ea; }
.app-main { flex: 1; display: flex; justify-content: center; padding: 32px 16px; }
</style>