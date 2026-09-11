<script setup lang="ts">
import type { Position } from '@vue-flow/core'
import type { EdgeKind } from '~/core'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  data: { kind: EdgeKind, flowing: boolean, dimmed: boolean, highlighted?: boolean, label?: string }
}>()

const path = computed(() => getSmoothStepPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  targetX: props.targetX,
  targetY: props.targetY,
  sourcePosition: props.sourcePosition,
  targetPosition: props.targetPosition,
  borderRadius: 12,
}))

/**
 * 标签从路径中点往起点方向拉。中点往往正好贴着目标节点的边缘，
 * 直接用中点会把标签压在目标节点的属性行上。
 */
const labelPos = computed(() => ({
  x: props.sourceX * 0.42 + path.value[1] * 0.58,
  y: props.sourceY * 0.42 + path.value[2] * 0.58,
}))
</script>

<template>
  <g
    data-edge
    :data-kind="data.kind"
    :data-flowing="String(!!data.flowing)"
    :data-dimmed="String(!!data.dimmed)"
    :data-highlighted="String(!!data.highlighted)"
    class="proto-edge"
  >
    <BaseEdge :id="id" :path="path[0]" />
    <EdgeLabelRenderer v-if="data.label">
      <div
        class="edge-label"
        :style="{ transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)` }"
      >
        {{ data.label }}
      </div>
    </EdgeLabelRenderer>
  </g>
</template>

<style scoped>
/* 三种语义永不混色 */
.proto-edge[data-kind='proto'] :deep(.vue-flow__edge-path) {
  stroke: var(--edge-proto);
}

.proto-edge[data-kind='prototype'] :deep(.vue-flow__edge-path) {
  stroke: var(--edge-prototype);
}

.proto-edge[data-kind='constructor'] :deep(.vue-flow__edge-path) {
  stroke: var(--edge-constructor);
}

.proto-edge :deep(.vue-flow__edge-path) {
  stroke-width: 1.8;
  transition: opacity 0.25s;
}

.proto-edge[data-dimmed='true'] {
  opacity: var(--focus-dim);
}

/* 被 hover 点亮的链：加辉光但不流动，流动是播放查找动画的专属语言 */
.proto-edge[data-highlighted='true'] :deep(.vue-flow__edge-path) {
  stroke-width: 2.4;
  filter: drop-shadow(0 0 var(--glow-size) var(--glow-color));
}

/* 流光只在播放 traverse 时开启，静止时是实线，避免全屏一直爬行 */
.proto-edge[data-flowing='true'] :deep(.vue-flow__edge-path) {
  stroke-dasharray: 6 6;
  filter: drop-shadow(0 0 var(--glow-size) var(--glow-color));
  animation: edge-flow 0.9s linear infinite;
}

@keyframes edge-flow {
  to {
    stroke-dashoffset: -12;
  }
}

.edge-label {
  /* 抬到节点之上：标签常落在路径中点，而中点往往贴着某个节点的边缘 */
  position: absolute;
  z-index: 1001;
  padding: 1px 6px;
  border: 1px solid var(--node-border);
  border-radius: 6px;
  background: var(--panel-bg);
  color: var(--text-muted);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
}
</style>
