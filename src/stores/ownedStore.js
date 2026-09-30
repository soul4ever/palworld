// src/stores/ownedStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePalStore } from './palStore'

const STORAGE_KEY = 'pal_owned_codes_v1'
const EXPORT_FORMAT = 'pal-owned-pals'
const EXPORT_VERSION = 1

export const useOwnedStore = defineStore('owned', () => {
  const palStore = usePalStore()
  const codes = ref(new Set())

  const count = computed(() => codes.value.size)
  const has = (code) => codes.value.has(code)
  const list = computed(() => [...codes.value])

  // 改完后要重建 Set，否则 Vue 的响应式不触发
  function _commit() {
    codes.value = new Set(codes.value)
    _save()
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...codes.value]))
    } catch (e) {
      console.warn('保存已拥有帕鲁失败', e)
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) codes.value = new Set(arr)
      }
    } catch (e) {
      console.warn('读取已拥有帕鲁失败', e)
    }
  }

  function add(code) {
    if (codes.value.has(code)) return
    codes.value.add(code)
    _commit()
  }

  function remove(code) {
    if (!codes.value.has(code)) return
    codes.value.delete(code)
    _commit()
  }

  function toggle(code) {
    codes.value.has(code) ? remove(code) : add(code)
  }

  function clear() {
    codes.value = new Set()
    _save()
  }

  function addMany(codeArr) {
    let added = 0
    for (const c of codeArr) {
      if (!codes.value.has(c)) { codes.value.add(c); added++ }
    }
    if (added) _commit()
    return added
  }

  function removeMany(codeArr) {
    let removed = 0
    for (const c of codeArr) {
      if (codes.value.has(c)) { codes.value.delete(c); removed++ }
    }
    if (removed) _commit()
    return removed
  }

  // ---------- 导出 ----------
  function exportJSON() {
    const pals = [...codes.value]
      .map(c => palStore.palByCode.get(c))
      .filter(Boolean)
      .map(p => ({
        code: p.code,
        name: p.name,
        cn: palStore.cnOf(p.code),
      }))

    const payload = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      count: pals.length,
      codes: pals.map(p => p.code),
      pals,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const fname =
      `owned_pals_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`

    const a = document.createElement('a')
    a.href = url
    a.download = fname
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    return { count: pals.length, fname }
  }

  // ---------- 导入 ----------
  // 返回 { valid, unknown } 供调用方弹确认框
  function parseImportFile(text) {
    const data = JSON.parse(text)
    let codes = []
    if (Array.isArray(data)) {
      codes = data
    } else if (data && Array.isArray(data.codes)) {
      codes = data.codes
    } else if (data && Array.isArray(data.pals)) {
      codes = data.pals.map(p => p.code).filter(Boolean)
    } else {
      throw new Error('无法识别的 JSON 结构')
    }
    const valid = codes.filter(c => palStore.palByCode.has(c))
    const unknown = codes.filter(c => !palStore.palByCode.has(c))
    return { valid, unknown }
  }

  function replaceAll(codeArr) {
    codes.value = new Set(codeArr)
    _save()
  }

  return {
    codes, count, has, list,
    load, add, remove, toggle, clear,
    addMany, removeMany,
    exportJSON, parseImportFile, replaceAll,
  }
})