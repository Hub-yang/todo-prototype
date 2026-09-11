<script setup lang="ts">
import { computed, ref } from 'vue'
import { exportPng } from '~/utils/exportImage'

const props = defineProps<{
  target: HTMLElement | null
  filename: string
}>()

const busy = ref(false)
const failed = ref(false)

async function onExport() {
  if (!props.target || busy.value)
    return

  busy.value = true
  failed.value = false
  try {
    await exportPng(props.target, props.filename)
  }
  catch (error) {
    // 导出可能超时或被浏览器限制，要让用户看到结果而不是静默无反应
    failed.value = true
    setTimeout(() => (failed.value = false), 2400)
    console.error('[导出图片失败]', error)
  }
  finally {
    busy.value = false
  }
}

const label = computed(() => {
  if (busy.value)
    return '导出中…'
  return failed.value ? '✗ 导出失败' : '⤓ 导出图片'
})
</script>

<template>
  <button data-export :disabled="busy" @click="onExport">
    {{ label }}
  </button>
</template>

<style scoped>
button {
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
