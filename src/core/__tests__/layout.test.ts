import type { GraphState } from '../types'
import { describe, expect, it, vi } from 'vitest'
import { layout } from '../layout'

/** p1 --proto--> Person.prototype --proto--> Object.prototype */
function chain(): GraphState {
  return {
    nodes: [
      { id: 'p1', label: 'p1', kind: 'instance', props: [] },
      { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
      { id: 'Object.prototype', label: 'Object.prototype', kind: 'prototype', props: [] },
    ],
    edges: [
      { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
      { id: 'e2', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto' },
    ],
  }
}

describe('layout', () => {
  it('原型链越往上，y 越小', () => {
    const pos = layout(chain())
    expect(pos.get('Object.prototype')!.y).toBeLessThan(pos.get('Person.prototype')!.y)
    expect(pos.get('Person.prototype')!.y).toBeLessThan(pos.get('p1')!.y)
  })

  it('每个节点都有坐标', () => {
    const pos = layout(chain())
    expect(pos.size).toBe(3)
  })

  it('函数节点被放在它的 prototype 左边同一行', () => {
    const g = chain()
    g.nodes.push({ id: 'Person', label: 'Person', kind: 'function', props: [] })
    g.edges.push({ id: 'e3', source: 'Person', target: 'Person.prototype', kind: 'prototype' })
    const pos = layout(g)
    expect(pos.get('Person')!.y).toBe(pos.get('Person.prototype')!.y)
    expect(pos.get('Person')!.x).toBeLessThan(pos.get('Person.prototype')!.x)
  })

  it('同层多个节点横向排开，不重叠', () => {
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'instance', props: [] },
        { id: 'b', label: 'b', kind: 'instance', props: [] },
        { id: 'root', label: 'root', kind: 'prototype', props: [] },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'root', kind: 'proto' },
        { id: 'e2', source: 'b', target: 'root', kind: 'proto' },
      ],
    }
    const pos = layout(g)
    expect(pos.get('a')!.y).toBe(pos.get('b')!.y)
    expect(pos.get('a')!.x).not.toBe(pos.get('b')!.x)
  })

  it('proto 边成环时不崩溃，并给出警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'plain', props: [] },
        { id: 'b', label: 'b', kind: 'plain', props: [] },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', kind: 'proto' },
        { id: 'e2', source: 'b', target: 'a', kind: 'proto' },
      ],
    }
    expect(() => layout(g)).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('constructor 边不参与深度计算', () => {
    const g = chain()
    g.edges.push({ id: 'e9', source: 'Person.prototype', target: 'p1', kind: 'constructor' })
    const pos = layout(g)
    expect(pos.get('Person.prototype')!.y).toBeLessThan(pos.get('p1')!.y)
  })

  it('指向图中不存在的节点时，该边不参与深度计算', () => {
    const g: GraphState = {
      nodes: [{ id: 'a', label: 'a', kind: 'plain', props: [] }],
      edges: [{ id: 'e1', source: 'a', target: '幽灵节点', kind: 'proto' }],
    }
    expect(() => layout(g)).not.toThrow()
    expect(layout(g).get('a')).toEqual({ x: 0, y: 0 })
  })

  it('支持自定义列宽与行高', () => {
    const pos = layout(chain(), { colWidth: 100, rowHeight: 50 })
    expect(pos.get('Object.prototype')!.y).toBe(0)
    expect(pos.get('Person.prototype')!.y).toBe(50)
    expect(pos.get('p1')!.y).toBe(100)
  })
})
