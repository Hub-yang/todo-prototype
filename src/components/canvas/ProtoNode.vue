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

/** 不同 kind 用不同的标题图标，一眼区分函数与对象 */
const sigil = computed(() => {
  switch (node.value.kind) {
    case 'function': return 'i-ph-function-bold'
    case 'prototype': return 'i-ph-cube-bold'
    case 'instance': return 'i-ph-dot-outline-fill'
    case 'null': return 'i-ph-prohibit-bold'
    default: return 'i-ph-brackets-curly-bold'
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
    <!--
      两个目标锚点：纵向的原型链从顶部进入，同层的横向引用从左侧进入。
      只留顶部锚点会让横向连线绕一大圈才能回到顶上。
    -->
    <Handle id="t-top" type="target" :position="Position.Top" />
    <Handle id="t-left" type="target" :position="Position.Left" />
    <Handle id="t-right" type="target" :position="Position.Right" />

    <div data-node-header class="header" @click="collapsed = !collapsed">
      <span data-sigil class="sigil" :class="sigil" />
      <span class="label">{{ node.label }}</span>
      <span
        data-chevron
        class="chevron"
        :class="collapsed ? 'i-ph-caret-right-bold' : 'i-ph-caret-down-bold'"
      />
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

.sigil {
  flex: none;
  color: var(--text-muted);
}

.label {
  font-weight: 600;
}

.chevron {
  flex: none;
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
