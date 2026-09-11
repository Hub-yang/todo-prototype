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
  data: { kind: EdgeKind, flowing: boolean, dimmed: boolean, label?: string }
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
</script>

<template>
  <g
    data-edge
    :data-kind="data.kind"
    :data-flowing="String(!!data.flowing)"
    :data-dimmed="String(!!data.dimmed)"
    class="proto-edge"
  >
    <BaseEdge :id="id" :path="path[0]" />
    <EdgeLabelRenderer v-if="data.label">
      <div
        class="edge-label"
        :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
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
  position: absolute;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--panel-bg);
  color: var(--text-muted);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  pointer-events: none;
}
</style>
