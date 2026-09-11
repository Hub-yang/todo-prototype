import type { GraphState } from '~/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { graphBounds, layout } from '~/core'
import ProtoCanvas from '../ProtoCanvas.vue'

// 视口实例由 VueFlow 通过 pane-ready 提供；测试里注入一个假实例，
// 这样走的是真实的实例注入路径，而不是把整个模块 mock 掉。
const fitBounds = vi.fn()
const onNodesInitialized = vi.fn()

const graph: GraphState = {
  nodes: [
    { id: 'p1', label: 'p1', kind: 'instance', props: [] },
    { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
  ],
  edges: [{ id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' }],
}

function mountCanvas(props: Record<string, unknown> = {}) {
  const wrapper = mount(ProtoCanvas, {
    props: { graph, ...props },
    global: { stubs: { VueFlow: true } },
  })
  // 模拟 VueFlow 就绪，把视口实例交给组件
  wrapper.vm.onPaneReady({ fitBounds, onNodesInitialized } as never)
  fitBounds.mockClear()
  return wrapper
}

interface PosNode { id: string, position: { x: number, y: number }, data: { dimmed: boolean, highlighted: boolean } }
interface FlowEdge { type: string, data: { kind: string, flowing: boolean, label?: string } }

describe('protoCanvas', () => {
  it('把 GraphState 转成带坐标的 Vue Flow 节点', () => {
    const nodes = mountCanvas().vm.nodes as PosNode[]
    expect(nodes).toHaveLength(2)
    expect(nodes.every(n => typeof n.position.x === 'number')).toBe(true)
  })

  it('边被标成自定义类型 proto，并带上语义 kind', () => {
    const edges = mountCanvas().vm.edges as FlowEdge[]
    expect(edges[0].type).toBe('proto')
    expect(edges[0].data.kind).toBe('proto')
  })

  it('dimmedNodes 会传进节点 data', async () => {
    const w = mountCanvas({ dimmedNodes: ['p1'] })
    await w.vm.$nextTick()
    const nodes = w.vm.nodes as PosNode[]
    expect(nodes.find(n => n.id === 'p1')!.data.dimmed).toBe(true)
    expect(nodes.find(n => n.id === 'Person.prototype')!.data.dimmed).toBe(false)
  })

  it('highlightedNodes 会传进节点 data', async () => {
    const w = mountCanvas({ highlightedNodes: ['p1'] })
    await w.vm.$nextTick()
    expect((w.vm.nodes as PosNode[]).find(n => n.id === 'p1')!.data.highlighted).toBe(true)
  })

  it('flowingEdges 会传进边 data', () => {
    const edges = mountCanvas({ flowingEdges: ['e1'] }).vm.edges as FlowEdge[]
    expect(edges[0].data.flowing).toBe(true)
  })

  it('横向的 prototype 边从左侧进入目标，纵向的 proto 边从顶部进入', () => {
    // 目标锚点若一律设在顶部，同层节点之间的横向连线会绕一大圈才能回到顶上
    const g: GraphState = {
      nodes: [
        ...graph.nodes,
        { id: 'Person', label: 'Person', kind: 'function' as const, props: [] },
      ],
      edges: [
        { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' as const },
        { id: 'e2', source: 'Person', target: 'Person.prototype', kind: 'prototype' as const },
      ],
    }
    const edges = mountCanvas({ graph: g }).vm.edges as Array<{ id: string, targetHandle: string }>
    expect(edges.find(e => e.id === 'e1')!.targetHandle).toBe('t-top')
    expect(edges.find(e => e.id === 'e2')!.targetHandle).toBe('t-left')
  })

  it('同层回指的 constructor 边从右侧进入，不绕到顶部', () => {
    // Person 位于 Person.prototype 左侧，constructor 由右指向左，
    // 若仍走顶部锚点，这条线会在图上方绕出一大片弧线
    const g: GraphState = {
      nodes: [
        { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype' as const, props: [] },
        { id: 'Person', label: 'Person', kind: 'function' as const, props: [] },
      ],
      edges: [
        { id: 'e-proto', source: 'Person', target: 'Person.prototype', kind: 'prototype' as const },
        { id: 'e-ctor', source: 'Person.prototype', target: 'Person', kind: 'constructor' as const },
      ],
    }
    const edges = mountCanvas({ graph: g }).vm.edges as Array<{ id: string, targetHandle: string }>
    expect(edges.find(e => e.id === 'e-ctor')!.targetHandle).toBe('t-right')
  })

  it('proto 边带 [[Prototype]] 标签，constructor 边不带标签', () => {
    const g: GraphState = {
      nodes: graph.nodes,
      edges: [
        { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
        { id: 'e2', source: 'Person.prototype', target: 'p1', kind: 'constructor' },
      ],
    }
    const edges = mountCanvas({ graph: g }).vm.edges as FlowEdge[]
    expect(edges[0].data.label).toBe('[[Prototype]]')
    expect(edges[1].data.label).toBeUndefined()
  })

  it('用户拖动过的节点，图变化时保留其位置', async () => {
    const w = mountCanvas()
    // 只有真正经历过拖动的节点才锁定位置
    w.vm.markDragged('p1')
    ;(w.vm.nodes as PosNode[]).find(n => n.id === 'p1')!.position = { x: 999, y: 888 }

    await w.setProps({
      graph: {
        ...graph,
        nodes: [...graph.nodes, { id: 'x', label: 'x', kind: 'plain' as const, props: [] }],
      },
    })

    const after = w.vm.nodes as PosNode[]
    expect(after.find(n => n.id === 'p1')!.position).toEqual({ x: 999, y: 888 })
    expect(after.find(n => n.id === 'x')).toBeDefined()
  })

  it('没被拖动过的节点，层级变化时必须跟随新布局', async () => {
    // 起点：孤立的 solo 没有 proto 出边，深度 0
    const before: GraphState = {
      nodes: [
        { id: 'root', label: 'root', kind: 'prototype', props: [] },
        { id: 'solo', label: 'solo', kind: 'instance', props: [] },
      ],
      edges: [],
    }
    const w = mountCanvas({ graph: before })
    const y0 = (w.vm.nodes as PosNode[]).find(n => n.id === 'solo')!.position.y

    // 接上链之后深度变为 1，纵向位置必须随之下移
    await w.setProps({
      graph: {
        nodes: before.nodes,
        edges: [{ id: 'e1', source: 'solo', target: 'root', kind: 'proto' as const }],
      },
    })

    const y1 = (w.vm.nodes as PosNode[]).find(n => n.id === 'solo')!.position.y
    expect(y1).toBeGreaterThan(y0)
  })

  it('节点增减时自动适配视口，避免新节点落在屏幕外', async () => {
    const w = mountCanvas()
    fitBounds.mockClear()

    await w.setProps({
      graph: {
        ...graph,
        nodes: [...graph.nodes, { id: 'x', label: 'x', kind: 'plain' as const, props: [] }],
      },
    })
    await w.vm.$nextTick()

    expect(fitBounds).toHaveBeenCalled()
  })

  it('仅数据变化（未增减节点）时不打扰视口', async () => {
    const w = mountCanvas()
    await w.vm.$nextTick()
    fitBounds.mockClear()

    await w.setProps({ dimmedNodes: ['p1'] })
    await w.vm.$nextTick()

    expect(fitBounds).not.toHaveBeenCalled()
  })

  it('resetLayout 之后，先前拖动的锁定被解除', async () => {
    const w = mountCanvas()
    w.vm.markDragged('p1')
    ;(w.vm.nodes as PosNode[]).find(n => n.id === 'p1')!.position = { x: 999, y: 888 }

    w.vm.resetLayout()
    await w.vm.$nextTick()

    await w.setProps({
      graph: {
        ...graph,
        nodes: [...graph.nodes, { id: 'x', label: 'x', kind: 'plain' as const, props: [] }],
      },
    })

    expect((w.vm.nodes as PosNode[]).find(n => n.id === 'p1')!.position).not.toEqual({ x: 999, y: 888 })
  })

  it('resetLayout 把位置恢复成布局算法的结果', async () => {
    const w = mountCanvas()
    const nodes = w.vm.nodes as PosNode[]
    nodes.find(n => n.id === 'p1')!.position = { x: 999, y: 888 }

    w.vm.resetLayout()
    await w.vm.$nextTick()

    expect((w.vm.nodes as PosNode[]).find(n => n.id === 'p1')!.position).not.toEqual({ x: 999, y: 888 })
  })

  it('focusNode 用该节点的布局坐标构造边界来聚焦', () => {
    const w = mountCanvas()
    fitBounds.mockClear()
    w.vm.focusNode('p1')

    const [bounds] = fitBounds.mock.calls[0]
    const expected = (w.vm.targetNodes as Array<{ id: string, position: { x: number, y: number } }>)
      .find(n => n.id === 'p1')!
      .position
    expect(bounds).toMatchObject({ x: expected.x, y: expected.y })
    expect(bounds.width).toBeGreaterThan(0)
  })

  it('highlightedEdges 会传进边 data，用于点亮整条链', () => {
    const edges = mountCanvas({ highlightedEdges: ['e1'] }).vm.edges as Array<{ data: { highlighted: boolean } }>
    expect(edges[0].data.highlighted).toBe(true)
  })

  it('pane-ready 之前调用视口操作不会抛错', () => {
    const wrapper = mount(ProtoCanvas, {
      props: { graph },
      global: { stubs: { VueFlow: true } },
    })
    // 实例尚未就绪时，视口指令应安静跳过而不是崩溃
    expect(() => wrapper.vm.resetLayout()).not.toThrow()
    expect(() => wrapper.vm.focusNode('p1')).not.toThrow()
    expect(() => wrapper.vm.fitAll()).not.toThrow()
  })

  it('默认不开启可见性裁剪', () => {
    const w = mountCanvas()
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(false)
  })

  it('即使允许裁剪，也要等节点初始化完成后才真正开启', async () => {
    // 提前开启会与节点测量形成死结：尺寸测不出来，视口操作全部静默失效
    const w = mountCanvas({ enableVisibilityCulling: true })
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(false)

    w.vm.onNodesReady()
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(true)
  })

  it('store 报告节点测量完成时就开启裁剪，不依赖 onNodesInitialized 事件', async () => {
    // 实测 Vue Flow 1.48：节点尺寸已测出、areNodesInitialized 已为 true，
    // onNodesInitialized 事件却始终不触发，只挂该事件会让裁剪永远开不起来
    const store = reactive({ fitBounds, onNodesInitialized: vi.fn(), areNodesInitialized: false })
    const w = mount(ProtoCanvas, {
      props: { graph, enableVisibilityCulling: true },
      global: { stubs: { VueFlow: true } },
    })
    w.vm.onPaneReady(store as never)
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(false)

    store.areNodesInitialized = true
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(true)
  })

  it('自动适配时为左上代码面板与右下讲解面板让出位置', () => {
    // 浮层压在画布之上，按图的真实边界适配会让左上、右下的节点被盖住
    const w = mountCanvas()
    fitBounds.mockClear()
    w.vm.fitAll()

    const [bounds] = fitBounds.mock.calls[0]
    const raw = graphBounds(layout(graph))
    expect(bounds.width).toBeGreaterThan(raw.width)
    expect(bounds.height).toBeGreaterThan(raw.height)
    expect(bounds.x).toBeLessThan(raw.x)
    expect(bounds.y).toBeLessThan(raw.y)
  })

  it('同层的 proto 边也从侧面进入目标，避免标签压在标题行上', () => {
    // d1 的 Function → Function.prototype 就是同层的 proto 边：
    // 若仍从顶部进入，连线会折回目标上方，[[Prototype]] 标签正好盖住标题
    const g: GraphState = {
      nodes: [
        { id: 'Function', label: 'Function', kind: 'function' as const, props: [] },
        { id: 'Function.prototype', label: 'Function.prototype', kind: 'prototype' as const, props: [] },
      ],
      edges: [
        // prototype 边会把函数节点挪到它 prototype 的同一行，于是这条 proto 边成了同层边
        { id: 'e-fn-proto', source: 'Function', target: 'Function.prototype', kind: 'prototype' as const },
        { id: 'e-self', source: 'Function', target: 'Function.prototype', kind: 'proto' as const },
      ],
    }
    const edges = mountCanvas({ graph: g }).vm.edges as Array<{ id: string, targetHandle: string }>
    expect(edges.find(e => e.id === 'e-self')!.targetHandle).not.toBe('t-top')
  })

  it('视口越窄，为代码面板让出的比例越大——面板是固定宽度，不随窗口缩放', () => {
    const wide = mount(ProtoCanvas, { props: { graph }, global: { stubs: { VueFlow: true } } })
    wide.vm.onPaneReady({ fitBounds, dimensions: { width: 1440, height: 900 } } as never)
    fitBounds.mockClear()
    wide.vm.fitAll()
    const [wideBounds] = fitBounds.mock.calls[0]

    const narrow = mount(ProtoCanvas, { props: { graph }, global: { stubs: { VueFlow: true } } })
    narrow.vm.onPaneReady({ fitBounds, dimensions: { width: 1024, height: 768 } } as never)
    fitBounds.mockClear()
    narrow.vm.fitAll()
    const [narrowBounds] = fitBounds.mock.calls[0]

    const raw = graphBounds(layout(graph))
    const leftRatio = (b: { x: number, width: number }) => (raw.x - b.x) / b.width
    expect(leftRatio(narrowBounds)).toBeGreaterThan(leftRatio(wideBounds))
  })
})
