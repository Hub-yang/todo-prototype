import type { GraphState } from '~/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ProtoCanvas from '../ProtoCanvas.vue'

// 视口操作依赖真实 DOM 测量，在测试环境里用假实现替掉，
// 本用例关心的是 GraphState → Vue Flow 元素的转换，不是视口行为。
const fitView = vi.fn()
vi.mock('@vue-flow/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vue-flow/core')>()
  return { ...actual, useVueFlow: () => ({ fitView }) }
})

const graph: GraphState = {
  nodes: [
    { id: 'p1', label: 'p1', kind: 'instance', props: [] },
    { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
  ],
  edges: [{ id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' }],
}

function mountCanvas(props: Record<string, unknown> = {}) {
  return mount(ProtoCanvas, {
    props: { graph, ...props },
    global: { stubs: { VueFlow: true } },
  })
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
    fitView.mockClear()

    await w.setProps({
      graph: {
        ...graph,
        nodes: [...graph.nodes, { id: 'x', label: 'x', kind: 'plain' as const, props: [] }],
      },
    })
    await w.vm.$nextTick()

    expect(fitView).toHaveBeenCalled()
  })

  it('仅数据变化（未增减节点）时不打扰视口', async () => {
    const w = mountCanvas()
    await w.vm.$nextTick()
    fitView.mockClear()

    await w.setProps({ dimmedNodes: ['p1'] })
    await w.vm.$nextTick()

    expect(fitView).not.toHaveBeenCalled()
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

  it('focusNode 会把视口聚焦到指定节点', () => {
    fitView.mockClear()
    mountCanvas().vm.focusNode('p1')
    expect(fitView).toHaveBeenCalledWith(expect.objectContaining({ nodes: ['p1'] }))
  })
})
