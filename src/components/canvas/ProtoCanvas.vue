<script setup lang="ts">
import type { Edge, Node, VueFlowStore } from '@vue-flow/core'
import type { Ref } from 'vue'
import type { GraphState } from '~/core'
import { VueFlow } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
import { graphBounds, layout, NODE_CELL } from '~/core'
import ProtoEdgeComp from './ProtoEdge.vue'
import ProtoNodeComp from './ProtoNode.vue'
import '@vue-flow/core/dist/style.css'

const props = withDefaults(defineProps<{
  graph: GraphState
  dimmedNodes?: string[]
  highlightedNodes?: string[]
  highlightedEdges?: string[]
  flowingEdges?: string[]
  enableVisibilityCulling?: boolean
}>(), {
  dimmedNodes: () => [],
  highlightedNodes: () => [],
  highlightedEdges: () => [],
  flowingEdges: () => [],
  enableVisibilityCulling: false,
})

const emit = defineEmits<{
  nodeHover: [nodeId: string | null]
  focusRef: [nodeId: string]
}>()

/** 坐标由 core 的 layout 算出，不使用 Vue Flow 的自动布局 */
const positions = computed(() => layout(props.graph))

/*
 * 视口实例只能取自 pane-ready 事件，不能用 useVueFlow() 自行创建：
 * 后者会新建一个独立 store，而 <VueFlow> 内部用的是另一个，于是 fitView、
 * 聚焦、重置布局全部静默失效——不报错，只是什么都不发生。
 */
const flow = ref<VueFlowStore | null>(null)

/*
 * 可见性裁剪只能在节点测量完成之后开启。
 * 提前开启会形成死结：它要靠节点尺寸判断可见性，而尺寸尚未测出，
 * 节点会一直停在 0×0 未初始化，导致自动适配、聚焦、重置布局全部静默失效。
 */
const nodesReady = ref(false)
const cullingActive = computed(() => props.enableVisibilityCulling && nodesReady.value)

function onNodesReady() {
  nodesReady.value = true
}

function onPaneReady(instance: VueFlowStore) {
  flow.value = instance
  /*
   * 不能靠 onNodesInitialized 事件来解锁裁剪：实测 Vue Flow 1.48 里节点尺寸
   * 已经测出、store 的 areNodesInitialized 也已为 true，该事件却始终不触发，
   * 裁剪会永远停在关闭状态。直接观察 store 上的状态才靠得住。
   */
  watch(() => instance.areNodesInitialized, (ok) => {
    if (ok)
      onNodesReady()
  }, { immediate: true })
  nextTick(() => fitAll())
}

/**
 * 画布四周被浮层占用的像素：左上是代码面板，右下是讲解面板与工具栏。
 * 走查发现按图的真实边界适配时，c1/c2/d1/d3 的左上角节点会被代码面板压住；
 * 而浮层是固定宽度，窗口越窄它占的比例越大，所以必须按视口实际尺寸换算。
 */
const PANEL_PX = { left: 400, top: 24, right: 24, bottom: 150 }

/** 兜底比例：拿不到视口尺寸时（例如尚未测量）按 1440×900 估算 */
const FALLBACK_VIEWPORT = { width: 1440, height: 900 }

/** 安全区不得小于视口的一半，否则窄窗口下图会被压得看不清 */
const MIN_SAFE_RATIO = 0.5

function panelInset() {
  const vw = flow.value?.dimensions?.width || FALLBACK_VIEWPORT.width
  const vh = flow.value?.dimensions?.height || FALLBACK_VIEWPORT.height
  const scale = (px: number, size: number) => px / size

  const left = scale(PANEL_PX.left, vw)
  const right = scale(PANEL_PX.right, vw)
  const top = scale(PANEL_PX.top, vh)
  const bottom = scale(PANEL_PX.bottom, vh)

  const shrinkW = Math.min(1, (1 - MIN_SAFE_RATIO) / (left + right))
  const shrinkH = Math.min(1, (1 - MIN_SAFE_RATIO) / (top + bottom))

  return {
    left: left * shrinkW,
    right: right * shrinkW,
    top: top * shrinkH,
    bottom: bottom * shrinkH,
  }
}

/**
 * 适配视口时一律走 fitBounds，边界由我们自己的布局坐标算出。
 *
 * 不能用 fitView：它依赖 Vue Flow 对节点的异步测量，而冷启动时节点常停在
 * 0×0 未初始化状态，此时 fitView 算不出边界，会静默什么都不做——不报错，
 * 只是自动适配、聚焦、重置布局全部失灵。fitBounds 接受显式边界，不受影响。
 *
 * 传给 fitBounds 的不是图本身的边界，而是按浮层占位反推出的更大矩形，
 * 这样图会落在中间的安全区里，不被浮层遮挡。
 */
function fitAll(padding = 0.06) {
  const bounds = graphBounds(positions.value)
  if (bounds.width <= 0)
    return

  const inset = panelInset()
  const width = bounds.width / (1 - inset.left - inset.right)
  const height = bounds.height / (1 - inset.top - inset.bottom)

  flow.value?.fitBounds({
    x: bounds.x - width * inset.left,
    y: bounds.y - height * inset.top,
    width,
    height,
  }, { padding })
}

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
    nextTick(() => fitAll())
}, { immediate: true, deep: true })

/**
 * 同层的边按左右关系就近进入，跨层的边从顶部进入。
 *
 * 这条规则对 proto 边同样适用：d1 里 Function 与 Function.prototype 处于同一层，
 * 若强制从顶部进入，连线会折回目标上方，[[Prototype]] 标签正好压住它的标题行。
 */
function targetHandleOf(source: string, target: string) {
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
    targetHandle: targetHandleOf(edge.source, edge.target),
    data: {
      kind: edge.kind,
      flowing: props.flowingEdges.includes(edge.id),
      highlighted: props.highlightedEdges.includes(edge.id),
      dimmed: props.dimmedNodes.includes(edge.source) || props.dimmedNodes.includes(edge.target),
      label,
    },
  }
}))

/** 用户拖乱之后，一键回到布局算法给出的构图，并解除全部位置锁定 */
function resetLayout() {
  draggedIds.clear()
  nodes.value = targetNodes.value.map(n => ({ ...n, position: { ...n.position } }))
  fitAll()
}

/** 把视口聚焦到某个节点，供「点击引用型属性行」使用 */
function focusNode(nodeId: string) {
  const p = positions.value.get(nodeId)
  if (!p)
    return
  flow.value?.fitBounds({ x: p.x, y: p.y, ...NODE_CELL }, { padding: 0.9 })
}

defineExpose({ nodes, edges, targetNodes, resetLayout, focusNode, markDragged, fitAll, onPaneReady, onNodesReady })
</script>

<template>
  <div class="canvas-wrap">
    <VueFlow
      v-model:nodes="nodes"
      :edges="edges"
      :only-render-visible-elements="cullingActive"
      :min-zoom="0.2"
      :max-zoom="2"
      @pane-ready="onPaneReady"
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
