<script setup lang="ts">
import type { ProtoNode } from '~/core'
import { Handle, Position } from '@vue-flow/core'
import { computed, ref } from 'vue'

const props = defineProps<{
  id: string
  data: { node: ProtoNode, dimmed: boolean, highlighted: boolean }
}>()

const emit = defineEmits<{ focusRef: [nodeId: string] }>()

const collapsed = ref(props.data.node.meta?.collapsed ?? false)
const node = computed(() => props.data.node)

/** 不同 kind 用不同的标题前缀，一眼区分函数与对象 */
const sigil = computed(() => {
  switch (node.value.kind) {
    case 'function': return 'ƒ'
    case 'prototype': return '⟐'
    case 'instance': return '▪'
    case 'null': return '∅'
    default: return '·'
  }
})

function onRowClick(refTo?: string) {
  if (refTo)
    emit('focusRef', refTo)
}
</script>

<template>
  <div
    data-node
    :data-dimmed="String(data.dimmed)"
    :data-highlighted="String(data.highlighted)"
    :data-kind="node.kind"
    class="proto-node"
  >
    <!-- 目标锚点统一在顶部，来源锚点按属性行分布在右侧 -->
    <Handle type="target" :position="Position.Top" />

    <div data-node-header class="header" @click="collapsed = !collapsed">
      <span class="sigil">{{ sigil }}</span>
      <span class="label">{{ node.label }}</span>
      <span class="chevron">{{ collapsed ? '▸' : '▾' }}</span>
    </div>

    <div v-if="!collapsed" class="rows">
      <div
        v-for="row in node.props"
        :key="row.key"
        data-prop-row
        class="row"
        :data-internal="String(row.kind === 'internal')"
        @click="onRowClick(row.refTo)"
      >
        <span class="key">{{ row.key }}</span>
        <span class="value">{{ row.value }}</span>
        <Handle v-if="row.refTo" :id="row.key" type="source" :position="Position.Right" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 颜色一律走 token，禁止字面量；节点不使用 backdrop-filter */
.proto-node {
  min-width: 190px;
  overflow: hidden;
  border: 1px solid var(--node-border);
  border-radius: 14px;
  background: var(--node-surface);
  color: var(--text-primary);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  transition: opacity 0.25s, filter 0.25s;
}

.proto-node[data-dimmed='true'] {
  opacity: var(--focus-dim);
}

.proto-node[data-highlighted='true'] {
  filter: drop-shadow(0 0 var(--glow-size) var(--glow-color));
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: var(--node-header);
  cursor: pointer;
  user-select: none;
}

.label {
  font-weight: 600;
}

.chevron {
  margin-left: auto;
  color: var(--text-muted);
}

.rows {
  padding: 4px 0;
}

.row {
  position: relative;
  display: flex;
  gap: 8px;
  padding: 3px 10px;
  cursor: pointer;
}

.row[data-internal='true'] .key {
  color: var(--edge-proto);
}

.key {
  color: var(--text-primary);
}

.value {
  margin-left: auto;
  color: var(--text-muted);
}
</style>
