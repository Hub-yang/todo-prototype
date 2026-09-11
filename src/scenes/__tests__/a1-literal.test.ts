import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { a1Literal } from '../a1-literal'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 a1：对象字面量的隐式原型', () => {
  it('通过通用完整性检查', () => {
    expectSceneIntegrity(a1Literal)
  })

  it('初始只有一个空的字面量对象，尚未画出原型关系', () => {
    const g = replay(a1Literal, 0)
    expect(g.nodes.map(n => n.id)).toContain('o')
    expect(hasEdge(g, 'o', 'Object.prototype', 'proto')).toBe(false)
  })

  it('字面量对象自动接到 Object.prototype 上', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    expect(hasEdge(g, 'o', 'Object.prototype', 'proto')).toBe(true)
  })

  it('toString 不在对象自己身上，却能通过原型链找到', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    expect(g.nodes.find(n => n.id === 'o')!.props.some(p => p.key === 'toString')).toBe(false)

    const r = resolveLookup(g, 'o', 'toString')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('Object.prototype')
  })

  it('演示查找 toString 的那一步，流光路径等于引擎求解的路径', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    const step = a1Literal.steps.find(s => s.title.includes('toString'))!
    expect(step.traverse).toEqual(resolveLookup(g, 'o', 'toString').edgePath)
  })

  it('链的终点是 null', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    const objProto = g.nodes.find(n => n.id === 'Object.prototype')!
    expect(objProto.props.some(p => p.kind === 'internal' && p.value === 'null')).toBe(true)
  })
})
