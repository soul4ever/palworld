// src/stores/uiStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY = 'pal_show_icons'

export const useUiStore = defineStore('ui', () => {
  const showIcons = ref(false)
  const saved = localStorage.getItem(KEY)
  if (saved !== null) showIcons.value = saved === '1'

  watch(showIcons, v => localStorage.setItem(KEY, v ? '1' : '0'))

  function toggleIcons() {
    showIcons.value = !showIcons.value
  }

  return { showIcons, toggleIcons }
})