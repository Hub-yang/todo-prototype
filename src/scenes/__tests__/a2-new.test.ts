import type { EdgeKind, GraphState } from '~/core'
import { describe, expect, it } from 'vitest'
import { replay } from '~/core'
import { a2New } from '../a2-new'

function hasEdge(g: GraphState, source: string, target: string, kind: EdgeKind) {
  return g.edges.some(e => e.source === source && e.target === target && e.kind === kind)
}

describe('场景 a2：new 到底做了什么', () => {
  it('初始状态只有构造函数与它的原型，还没有实例', () => {
    const g = replay(a2New, 0)
    expect(g.nodes.map(n => n.id)).toContain('Person')
    expect(g.nodes.map(n => n.id)).toContain('Person.prototype')
    expect(g.nodes.map(n => n.id)).not.toContain('p1')
  })

  it('函数与它的 prototype 之间从一开始就有 prototype 边', () => {
    expect(hasEdge(replay(a2New, 0), 'Person', 'Person.prototype', 'prototype')).toBe(true)
  })

  it('第 1 步创建出空对象', () => {
    expect(replay(a2New, 1).nodes.map(n => n.id)).toContain('p1')
  })

  it('第 1 步的对象确实是空的，此时还没接上链', () => {
    const g = replay(a2New, 1)
    expect(g.nodes.find(n => n.id === 'p1')!.props).toHaveLength(0)
    expect(hasEdge(g, 'p1', 'Person.prototype', 'proto')).toBe(false)
  })

  it('第 2 步把实例接到 Person.prototype 上', () => {
    expect(hasEdge(replay(a2New, 2), 'p1', 'Person.prototype', 'proto')).toBe(true)
  })

  it('第 3 步在实例上写入 name 属性', () => {
    const p1 = replay(a2New, 3).nodes.find(n => n.id === 'p1')!
    expect(p1.props.some(p => p.key === 'name')).toBe(true)
  })

  it('name 写在实例自己身上，而不是原型上', () => {
    const g = replay(a2New, 3)
    expect(g.nodes.find(n => n.id === 'Person.prototype')!.props.some(p => p.key === 'name')).toBe(false)
  })

  it('全部走完后，实例的原型链能通到 Object.prototype', () => {
    const g = replay(a2New, a2New.steps.length)
    expect(hasEdge(g, 'p1', 'Person.prototype', 'proto')).toBe(true)
    expect(hasEdge(g, 'Person.prototype', 'Object.prototype', 'proto')).toBe(true)
  })

  it('链末端是 null，不再有 proto 出边', () => {
    const g = replay(a2New, a2New.steps.length)
    expect(g.edges.some(e => e.source === 'Object.prototype' && e.kind === 'proto')).toBe(false)
  })

  it('每一步都有讲解文案与代码行区间', () => {
    for (const s of a2New.steps) {
      expect(s.narration.length).toBeGreaterThan(0)
      expect(s.codeRange).toBeDefined()
    }
  })

  it('所有边引用的节点都真实存在，不存在悬空边', () => {
    const g = replay(a2New, a2New.steps.length)
    const ids = new Set(g.nodes.map(n => n.id))
    for (const e of g.edges) {
      expect(ids.has(e.source)).toBe(true)
      expect(ids.has(e.target)).toBe(true)
    }
  })

  it('所有 traverse 引用的边都真实存在', () => {
    const g = replay(a2New, a2New.steps.length)
    const edgeIds = new Set(g.edges.map(e => e.id))
    for (const s of a2New.steps) {
      for (const id of s.traverse ?? [])
        expect(edgeIds.has(id)).toBe(true)
    }
  })
})
