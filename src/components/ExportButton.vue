<script setup lang="ts">
import { ref } from 'vue'
import { exportPng } from '~/utils/exportImage'

const props = defineProps<{
  target: HTMLElement | null
  filename: string
}>()

const busy = ref(false)

async function onExport() {
  if (!props.target || busy.value)
    return

  busy.value = true
  try {
    await exportPng(props.target, props.filename)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <button data-export :disabled="busy" @click="onExport">
    {{ busy ? '导出中…' : '⤓ 导出图片' }}
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
