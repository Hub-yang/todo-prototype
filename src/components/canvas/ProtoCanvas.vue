<script setup lang="ts">
import type { Edge, Node } from '@vue-flow/core'
import type { GraphState } from '~/core'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, ref, watch } from 'vue'
import { layout } from '~/core'
import ProtoEdgeComp from './ProtoEdge.vue'
import ProtoNodeComp from './ProtoNode.vue'
import '@vue-flow/core/dist/style.css'

const props = withDefaults(defineProps<{
  graph: GraphState
  dimmedNodes?: string[]
  highlightedNodes?: string[]
  flowingEdges?: string[]
}>(), {
  dimmedNodes: () => [],
  highlightedNodes: () => [],
  flowingEdges: () => [],
})

const emit = defineEmits<{
  nodeHover: [nodeId: string | null]
  focusRef: [nodeId: string]
}>()

const { fitView } = useVueFlow()

/** 坐标由 core 的 layout 算出，不使用 Vue Flow 的自动布局 */
const positions = computed(() => layout(props.graph))

/** 由 GraphState 推导出的「应有」节点列表，位置来自布局算法 */
const targetNodes = computed<Node[]>(() => props.graph.nodes.map(node => ({
  id: node.id,
  type: 'proto',
  position: positions.value.get(node.id) ?? { x: 0, y: 0 },
  data: {
    node,
    dimmed: props.dimmedNodes.includes(node.id),
    highlighted: props.highlightedNodes.includes(node.id),
  },
})))

/**
 * 实际渲染的节点必须是可写 ref 并用 v-model 绑定，
 * 否则用户拖动产生的位置变化没有地方落地，会被下一次重算覆盖。
 */
const nodes = ref<Node[]>([])

watch(targetNodes, (next) => {
  const kept = new Map(nodes.value.map(n => [n.id, n.position]))
  // 已存在的节点保留用户拖动后的位置，只更新 data；新节点用布局位置
  nodes.value = next.map(n => ({ ...n, position: kept.get(n.id) ?? n.position }))
}, { immediate: true, deep: true })

const edges = computed<Edge[]>(() => props.graph.edges.map((edge) => {
  const label = edge.kind === 'proto'
    ? '[[Prototype]]'
    : edge.kind === 'prototype' ? 'prototype' : undefined

  return {
    id: edge.id,
    type: 'proto',
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    data: {
      kind: edge.kind,
      flowing: props.flowingEdges.includes(edge.id),
      dimmed: props.dimmedNodes.includes(edge.source) || props.dimmedNodes.includes(edge.target),
      label,
    },
  }
}))

/** 用户拖乱之后，一键回到布局算法给出的构图 */
function resetLayout() {
  nodes.value = targetNodes.value.map(n => ({ ...n }))
  fitView({ padding: 0.2 })
}

/** 把视口聚焦到某个节点，供「点击引用型属性行」使用 */
function focusNode(nodeId: string) {
  fitView({ nodes: [nodeId], padding: 0.6, duration: 400 })
}

defineExpose({ nodes, edges, targetNodes, resetLayout, focusNode, fitView })
</script>

<template>
  <div class="canvas-wrap">
    <VueFlow
      v-model:nodes="nodes"
      :edges="edges"
      :only-render-visible-elements="true"
      :min-zoom="0.2"
      :max-zoom="2"
      fit-view-on-init
      @node-mouse-enter="e => emit('nodeHover', e.node.id)"
      @node-mouse-leave="() => emit('nodeHover', null)"
    >
      <template #node-proto="nodeProps">
        <ProtoNodeComp v-bind="nodeProps" @focus-ref="id => emit('focusRef', id)" />
      </template>
      <template #edge-proto="edgeProps">
        <ProtoEdgeComp v-bind="edgeProps" />
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas-wrap {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(420px 220px at 18% 18%, var(--canvas-glow-a), transparent 70%),
    radial-gradient(380px 200px at 78% 78%, var(--canvas-glow-b), transparent 70%),
    radial-gradient(circle at 1px 1px, var(--canvas-grid) 1px, transparent 0) 0 0 / 22px 22px,
    var(--canvas-bg);
}
</style>
