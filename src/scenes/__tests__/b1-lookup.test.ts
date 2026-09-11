import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { b1Lookup } from '../b1-lookup'

describe('场景 b1：属性查找逐跳', () => {
  const final = replay(b1Lookup, b1Lookup.steps.length)

  it('say 定义在 Person.prototype 上，而不是实例上', () => {
    const p1 = final.nodes.find(n => n.id === 'p1')!
    const proto = final.nodes.find(n => n.id === 'Person.prototype')!
    expect(p1.props.some(p => p.key === 'say')).toBe(false)
    expect(proto.props.some(p => p.key === 'say')).toBe(true)
  })

  it('查找 say 会在 Person.prototype 命中，恰好跳一次', () => {
    const r = resolveLookup(final, 'p1', 'say')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('Person.prototype')
    expect(r.edgePath).toHaveLength(1)
  })

  it('查找 name 在实例自身命中，不跳转', () => {
    const r = resolveLookup(final, 'p1', 'name')
    expect(r.hitNodeId).toBe('p1')
    expect(r.edgePath).toHaveLength(0)
  })

  it('查找不存在的属性会走到链末端且 found 为 false', () => {
    const r = resolveLookup(final, 'p1', 'fly')
    expect(r.found).toBe(false)
    expect(r.nodePath).toEqual(['p1', 'Person.prototype', 'Object.prototype'])
  })

  // 下面两条保证「动画演示的路径」就是「引擎算出来的路径」，两者不会各说各话
  it('讲解 say 的那一步，流光路径正好等于查找 say 的真实路径', () => {
    const sayStep = b1Lookup.steps.find(s => s.title.includes('say'))!
    expect(sayStep.traverse).toEqual(resolveLookup(final, 'p1', 'say').edgePath)
  })

  it('讲解 fly 的那一步，流光路径正好等于走到链末端的真实路径', () => {
    const flyStep = b1Lookup.steps.find(s => s.title.includes('fly'))!
    expect(flyStep.traverse).toEqual(resolveLookup(final, 'p1', 'fly').edgePath)
  })

  it('每一步都有讲解文案与代码行区间', () => {
    for (const s of b1Lookup.steps) {
      expect(s.narration.length).toBeGreaterThan(0)
      expect(s.codeRange).toBeDefined()
    }
  })

  it('所有边引用的节点都真实存在，不存在悬空边', () => {
    const ids = new Set(final.nodes.map(n => n.id))
    for (const e of final.edges) {
      expect(ids.has(e.source)).toBe(true)
      expect(ids.has(e.target)).toBe(true)
    }
  })
})
