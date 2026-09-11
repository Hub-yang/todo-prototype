<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  code: string
  /** 需高亮的行区间，1 起算，闭区间 */
  highlight?: [number, number]
}>()

const collapsed = ref(false)
const lines = computed(() => props.code.split('\n'))

function isActive(lineNo: number) {
  if (!props.highlight)
    return false
  const [from, to] = props.highlight
  return lineNo >= from && lineNo <= to
}
</script>

<template>
  <div class="panel">
    <div class="bar">
      <span class="name">code.js</span>
      <button data-collapse @click="collapsed = !collapsed">
        {{ collapsed ? '▸' : '▾' }}
      </button>
    </div>

    <pre v-if="!collapsed" class="code"><code
      v-for="(line, i) in lines"
      :key="i"
      data-line
      :data-active="String(isActive(i + 1))"
      class="line"
    >{{ line || ' ' }}</code></pre>
  </div>
</template>

<style scoped>
/* 浮层允许 backdrop-filter */
.panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: min(360px, calc(100% - 40px));
  overflow: hidden;
  border: 1px solid var(--node-border);
  border-radius: 12px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
}

.bar {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-bottom: 1px solid var(--node-border);
}

.name {
  color: var(--text-muted);
  font-size: 11px;
}

.bar button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.code {
  margin: 0;
  padding: 8px 0;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.8;
}

.line {
  display: block;
  padding: 0 12px;
  color: var(--text-muted);
  white-space: pre;
}

.line[data-active='true'] {
  padding-left: 10px;
  border-left: 2px solid var(--edge-prototype);
  background: var(--node-header);
  color: var(--text-primary);
}
</style>
