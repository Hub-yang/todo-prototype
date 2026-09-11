import { describe, expect, it } from 'vitest'
import { protoChain, replay } from '~/core'
import { a3PrototypeVsProto } from '../a3-prototype-vs-proto'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 a3：prototype 与 __proto__ 的区别', () => {
  const final = replay(a3PrototypeVsProto, a3PrototypeVsProto.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(a3PrototypeVsProto)
  })

  it('prototype 是函数身上的普通属性，画成 prototype 边', () => {
    expect(hasEdge(final, 'Person', 'Person.prototype', 'prototype')).toBe(true)
  })

  it('实例的 [[Prototype]] 是内部槽，画成 proto 边', () => {
    expect(hasEdge(final, 'p', 'Person.prototype', 'proto')).toBe(true)
  })

  it('两者指向同一个对象——这正是本场景要讲清的事', () => {
    const fromFunction = final.edges.find(e => e.source === 'Person' && e.kind === 'prototype')!
    const fromInstance = final.edges.find(e => e.source === 'p' && e.kind === 'proto')!
    expect(fromFunction.target).toBe(fromInstance.target)
  })

  it('函数自己也有 [[Prototype]]，指向 Function.prototype，与它的 prototype 属性无关', () => {
    expect(hasEdge(final, 'Person', 'Function.prototype', 'proto')).toBe(true)
    // 函数的原型链与它的 prototype 属性是两条完全不同的线
    expect(protoChain(final, 'Person')).not.toContain('Person.prototype')
  })

  it('实例的原型链上没有 Function.prototype', () => {
    expect(protoChain(final, 'p')).toEqual(['p', 'Person.prototype', 'Object.prototype'])
  })
})
