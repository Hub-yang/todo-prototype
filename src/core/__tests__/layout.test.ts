import type { GraphState } from '../types'
import { describe, expect, it, vi } from 'vitest'
import { graphBounds, layout } from '../layout'

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

/** n 对「构造函数 + prototype」，所有 prototype 都挂在同一个 root 下（d2 全景图的结构） */
function manyPairs(n: number): GraphState {
  const nodes: GraphState['nodes'] = [
    { id: 'root', label: 'root', kind: 'prototype', props: [] },
  ]
  const edges: GraphState['edges'] = []
  for (let i = 0; i < n; i++) {
    nodes.push({ id: `F${i}`, label: `F${i}`, kind: 'function', props: [] })
    nodes.push({ id: `F${i}.prototype`, label: `F${i}.prototype`, kind: 'prototype', props: [] })
    edges.push({ id: `ep${i}`, source: `F${i}`, target: `F${i}.prototype`, kind: 'prototype' })
    edges.push({ id: `eo${i}`, source: `F${i}.prototype`, target: 'root', kind: 'proto' })
  }
  return { nodes, edges }
}

/** 同一坐标上是否落了多个节点 */
function overlaps(pos: Map<string, { x: number, y: number }>): string[] {
  const seen = new Map<string, string>()
  const dup: string[] = []
  for (const [id, p] of pos) {
    const key = `${p.x},${p.y}`
    const first = seen.get(key)
    if (first)
      dup.push(`${first} 与 ${id} 同处 ${key}`)
    else seen.set(key, id)
  }
  return dup
}

describe('构造函数对过多时的竖排布局', () => {
  it('少于 6 对时维持左置', () => {
    const pos = layout(manyPairs(5))
    expect(pos.get('F0')!.y).toBe(pos.get('F0.prototype')!.y)
    expect(pos.get('F0')!.x).toBeLessThan(pos.get('F0.prototype')!.x)
  })

  it('达到 6 对时，函数节点改放到自己 prototype 的正下方', () => {
    const pos = layout(manyPairs(6))
    for (let i = 0; i < 6; i++) {
      expect(pos.get(`F${i}`)!.x).toBe(pos.get(`F${i}.prototype`)!.x)
      expect(pos.get(`F${i}`)!.y).toBe(pos.get(`F${i}.prototype`)!.y + 220)
    }
  })

  it('竖排后整张图的宽度大致减半', () => {
    const wide = graphBounds(layout(manyPairs(5))).width
    const tall = graphBounds(layout(manyPairs(6))).width
    // 5 对横排要 10 列，6 对竖排只要 6 列
    expect(tall).toBeLessThan(wide)
  })

  it('竖排占用的格子上原有的节点，让位到同行空位', () => {
    const g = manyPairs(7)
    g.nodes.push({ id: 'inst', label: 'inst', kind: 'instance', props: [] })
    g.edges.push({ id: 'e-inst', source: 'inst', target: 'F0.prototype', kind: 'proto' })

    const pos = layout(g)
    // inst 与 F0 同深度，都该落在 prototype 行的下一行，但不能挤在同一格
    expect(pos.get('inst')!.y).toBe(pos.get('F0')!.y)
    expect(pos.get('inst')!.x).not.toBe(pos.get('F0')!.x)
    expect(overlaps(pos)).toEqual([])
  })

  it('竖排后没有任何两个节点坐标重叠', () => {
    expect(overlaps(layout(manyPairs(7)))).toEqual([])
  })
})
