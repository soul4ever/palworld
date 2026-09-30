<script setup>
import { ref, computed } from 'vue'
import { usePalStore } from '@/stores/palStore'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  withIcon: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'select'])

const palStore = usePalStore()
const uiStore = useUiStore()

const open = ref(false)
const inputEl = ref(null)

const matches = computed(() => {
  const val = props.modelValue.trim()
  if (!val) return []
  const ql = val.toLowerCase()
  return palStore.pals
    .filter(p => {
      const cn = palStore.cnNameMap[p.code] || ''
      return (
        p.name.toLowerCase().includes(ql) ||
        p.code.toLowerCase().includes(ql) ||
        cn.includes(val)
      )
    })
    .slice(0, 20)
})

function onInput(e) {
  emit('update:modelValue', e.target.value)
  open.value = true
}

function onFocus() {
  if (props.modelValue.trim()) open.value = true
}

function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}

function pick(p) {
  emit('update:modelValue', palStore.cnOf(p.code))
  emit('select', p)
  open.value = false
}

// 让外部能主动清空/关闭
defineExpose({ close: () => { open.value = false } })
</script>

<template>
  <div class="autocomplete-wrap">
    <input
      ref="inputEl"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <div
      v-if="open && matches.length"
      class="autocomplete-list"
      :class="{ 'with-icon': withIcon }"
    >
      <div
        v-for="p in matches"
        :key="p.code"
        @mousedown.prevent="pick(p)"
      >
        <template v-if="withIcon">
          <img
            v-if="uiStore.showIcons"
            class="ac-icon"
            :src="palStore.iconUrl(p.code)"
            :alt="palStore.cnOf(p.code)"
            @error="e => e.target.style.visibility = 'hidden'"
          />
          <span class="ac-text">
            <span class="ac-cn">{{ palStore.cnOf(p.code) }}</span>
            <span class="ac-en">{{ p.name }}</span>
          </span>
        </template>
        <template v-else>
          <span class="ac-cn">{{ palStore.cnOf(p.code) }}</span>
          <span class="ac-en">{{ p.name }} · {{ p.code }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.autocomplete-wrap { position: relative; }
</style>