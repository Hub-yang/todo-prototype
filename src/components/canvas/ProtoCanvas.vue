<script setup lang="ts">
import type { Edge, Node } from '@vue-flow/core'
import type { Ref } from 'vue'
import type { GraphState } from '~/core'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
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
// 断言到 Ref<Node[]> 是必要的：Vue Flow 的 Node 类型嵌套极深，
// 交给 ref 自行推导会触发 UnwrapRef 的无限递归（TS2589）。
const nodes = ref<Node[]>([]) as Ref<Node[]>

/**
 * 只有被用户真正拖动过的节点才锁定位置。
 * 不能一律保留已有坐标：节点的原型链深度会随步骤变化（例如实例接上 [[Prototype]]
 * 之后深度从 0 变成 2），一律保留会把它钉死在过时的层级上。
 */
const draggedIds = new Set<string>()

function markDragged(id: string) {
  draggedIds.add(id)
}

watch(targetNodes, (next) => {
  const kept = new Map(nodes.value.map(n => [n.id, n.position]))
  const prevIds = new Set(nodes.value.map(n => n.id))

  // 必须拷贝节点与 position：Vue Flow 拖动时会原地修改 node.position，
  // 直接复用 targetNodes 的对象会把计算属性的缓存一并改掉。
  nodes.value = next.map(n =>
    draggedIds.has(n.id) && kept.has(n.id)
      ? { ...n, position: { ...kept.get(n.id)! } }
      : { ...n, position: { ...n.position } },
  )

  // 节点增减会改变整张图的范围，需重新适配视口，否则新节点可能落在屏幕外；
  // 仅数据变化（高亮、淡化）时不动视口，避免打断用户正在看的位置。
  const idsChanged = next.length !== prevIds.size || next.some(n => !prevIds.has(n.id))
  if (idsChanged)
    nextTick(() => fitView({ padding: 0.22 }))
}, { immediate: true, deep: true })

/**
 * 纵向上溯的 proto 边从顶部进入目标；同层的横向引用按左右关系就近进入，
 * 否则会在图上方绕出一大片多余的弧线。
 */
function targetHandleOf(source: string, target: string, kind: string) {
  if (kind === 'proto')
    return 't-top'

  const s = positions.value.get(source)
  const t = positions.value.get(target)
  if (s && t && s.y === t.y)
    return s.x > t.x ? 't-right' : 't-left'

  return 't-top'
}

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
    targetHandle: targetHandleOf(edge.source, edge.target, edge.kind),
    data: {
      kind: edge.kind,
      flowing: props.flowingEdges.includes(edge.id),
      dimmed: props.dimmedNodes.includes(edge.source) || props.dimmedNodes.includes(edge.target),
      label,
    },
  }
}))

/** 用户拖乱之后，一键回到布局算法给出的构图，并解除全部位置锁定 */
function resetLayout() {
  draggedIds.clear()
  nodes.value = targetNodes.value.map(n => ({ ...n, position: { ...n.position } }))
  fitView({ padding: 0.22 })
}

/** 把视口聚焦到某个节点，供「点击引用型属性行」使用 */
function focusNode(nodeId: string) {
  fitView({ nodes: [nodeId], padding: 0.6, duration: 400 })
}

defineExpose({ nodes, edges, targetNodes, resetLayout, focusNode, markDragged, fitView })
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
      @node-drag-stop="e => markDragged(e.node.id)"
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
