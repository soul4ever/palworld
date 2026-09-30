// src/stores/palStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BreedingEngine } from '@/utils/breedingEngine'

export const usePalStore = defineStore('pal', () => {
  // ---------- state ----------
  const dataset = ref(null)          // dataset.json 原始内容
  const cnNameMap = ref({})          // code -> 中文名
  const loading = ref(false)
  const error = ref(null)
  const loaded = ref(false)

  // ---------- 索引（Map 查询）----------
  const palByCode = ref(new Map())
  const palByNameLower = ref(new Map())
  const palByCnName = ref(new Map())

  // ---------- getters ----------
  const pals = computed(() => dataset.value?.pals ?? [])
  const uniqueCombos = computed(() => dataset.value?.uniqueCombos ?? [])
  const directional = computed(() => dataset.value?.directional ?? {})

  // 配种引擎：数据加载完后创建一次
  const engine = computed(() => {
    if (!loaded.value) return null
    return new BreedingEngine(pals.value, uniqueCombos.value, directional.value)
  })

  // ---------- actions ----------
  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      const [dsRes, cnRes] = await Promise.all([
        fetch('/data/dataset.json'),
        fetch('/data/cn_name_map.json'),
      ])
      if (!dsRes.ok) throw new Error(`dataset.json 加载失败: ${dsRes.status}`)
      if (!cnRes.ok) throw new Error(`cn_name_map.json 加载失败: ${cnRes.status}`)

      dataset.value = await dsRes.json()
      cnNameMap.value = await cnRes.json()

      // 建索引
      const byCode = new Map()
      const byName = new Map()
      const byCn = new Map()
      for (const p of dataset.value.pals) {
        byCode.set(p.code, p)
        byName.set(p.name.toLowerCase(), p)
        const cn = cnNameMap.value[p.code]
        if (cn) byCn.set(cn, p)
      }
      palByCode.value = byCode
      palByNameLower.value = byName
      palByCnName.value = byCn

      loaded.value = true
      console.log(
        `[palStore] 已加载 ${dataset.value.pals.length} 只帕鲁，` +
        `${dataset.value.uniqueCombos.length} 组唯一配方，` +
        `${Object.keys(dataset.value.directional || {}).length} 组方向性配方`
      )
    } catch (e) {
      error.value = e.message
      console.error('[palStore] 加载失败', e)
    } finally {
      loading.value = false
    }
  }

  // 名称解析
  function resolvePal(input) {
    const q = (input || '').trim()
    if (!q) return { matches: [] }

    const exact =
      palByCode.value.get(q) ||
      palByNameLower.value.get(q.toLowerCase()) ||
      palByCnName.value.get(q)
    if (exact) return { pal: exact, matches: [] }

    const ql = q.toLowerCase()
    const matches = dataset.value.pals
      .filter(p => {
        const cn = cnNameMap.value[p.code] || ''
        return (
          p.name.toLowerCase().includes(ql) ||
          p.code.toLowerCase().includes(ql) ||
          cn.includes(q)
        )
      })
      .sort((a, b) => {
        const ca = cnNameMap.value[a.code] || a.name
        const cb = cnNameMap.value[b.code] || b.name
        return ca.localeCompare(cb, 'zh-CN')
      })
    return { matches }
  }

  function cnOf(code) {
    return cnNameMap.value[code] || palByCode.value.get(code)?.name || code
  }

  function iconUrl(code) {
    if (!code) return ''
    return `/img/pals/T_${code}_icon_normal.webp`
  }



  // ============================================================
  // 属性 / 工作适性 中英映射
  // ============================================================
  const ELEMENT_CN = {
    Normal: '无属性',
    Leaf: '草',
    Fire: '火',
    Water: '水',
    Electricity: '电',
    Earth: '地',
    Ice: '冰',
    Dark: '暗',
    Dragon: '龙',
    Neutral: '无属性',
  }

  // 技能属性词表（和帕鲁属性词表不完全一样）
  const SKILL_ELEMENT_CN = {
    Normal: '无属性',
    Neutral: '无属性',
    Leaf: '草',
    Grass: '草',
    Fire: '火',
    Water: '水',
    Electricity: '电',
    Electric: '电',
    Earth: '地',
    Ground: '地',
    Ice: '冰',
    Dark: '暗',
    Dragon: '龙',
  }

  function skillElementCn(key) {
    return SKILL_ELEMENT_CN[key] || ELEMENT_CN[key] || key
  }

  // 属性显示顺序（图鉴筛选栏用）
  const ELEMENT_ORDER = [
    'Normal', 'Fire', 'Water', 'Leaf', 'Electricity',
    'Earth', 'Ice', 'Dark', 'Dragon',
  ]

  const WORK_CN = {
    Kindling: '点火',
    Watering: '浇水',
    Planting: '播种',
    GenerateElectricity: '发电',
    Handiwork: '手工',
    Gathering: '采集',
    Lumbering: '伐木',
    Mining: '挖矿',
    MedicineProduction: '制药',
    Cooling: '冷却',
    Transporting: '搬运',
    Farming: '牧场',
  }

  // 工作显示顺序
  const WORK_ORDER = [
    'Kindling', 'Watering', 'Planting', 'GenerateElectricity',
    'Handiwork', 'Gathering', 'Lumbering', 'Mining',
    'MedicineProduction', 'Cooling', 'Transporting', 'Farming',
  ]

  // 便捷查询函数
  function elementCn(key) {
    return ELEMENT_CN[key] || key
  }

  function workCn(key) {
    return WORK_CN[key] || key
  }

  // 当前数据里出现过的属性（按 ELEMENT_ORDER 排）
  const availableElements = computed(() => {
    const s = new Set()
    for (const p of pals.value) {
      for (const e of p.element || []) s.add(e)
    }
    return ELEMENT_ORDER.filter(e => s.has(e))
  })

  // 当前数据里出现过的工作适性（按 WORK_ORDER 排）
  const availableWorks = computed(() => {
    const s = new Set()
    for (const p of pals.value) {
      for (const w of p.workSuitability || []) s.add(w.work)
    }
    return WORK_ORDER.filter(w => s.has(w))
  })


  return {
    // state
    dataset, cnNameMap, loading, error, loaded,
    // 索引
    palByCode, pals, uniqueCombos, directional,
    // 引擎
    engine,
    // actions
    load, resolvePal, cnOf, iconUrl,
    // 映射
    ELEMENT_CN, ELEMENT_ORDER, WORK_CN, WORK_ORDER,
    elementCn, workCn, availableElements, availableWorks,
    skillElementCn,
  }
})