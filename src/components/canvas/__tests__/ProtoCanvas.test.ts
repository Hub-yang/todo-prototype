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

  it('图变化时，已存在节点保留用户拖动后的位置', async () => {
    const w = mountCanvas()
    const nodes = w.vm.nodes as PosNode[]
    // 模拟用户把 p1 拖到别处
    nodes.find(n => n.id === 'p1')!.position = { x: 999, y: 888 }

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
