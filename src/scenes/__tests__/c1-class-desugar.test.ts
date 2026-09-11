import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { c1ClassDesugar } from '../c1-class-desugar'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 c1：class 展开成 ES5', () => {
  const final = replay(c1ClassDesugar, c1ClassDesugar.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(c1ClassDesugar)
  })

  it('class 声明出来的 Person 仍然是函数', () => {
    expect(final.nodes.find(n => n.id === 'Person')!.kind).toBe('function')
  })

  it('实例方法挂在 Person.prototype 上，不在实例上', () => {
    expect(final.nodes.find(n => n.id === 'Person.prototype')!.props.some(p => p.key === 'say')).toBe(true)
    expect(final.nodes.find(n => n.id === 'p')!.props.some(p => p.key === 'say')).toBe(false)
  })

  it('静态方法挂在 Person 自己身上，不在原型上', () => {
    expect(final.nodes.find(n => n.id === 'Person')!.props.some(p => p.key === 'create')).toBe(true)
    expect(final.nodes.find(n => n.id === 'Person.prototype')!.props.some(p => p.key === 'create')).toBe(false)
  })

  it('实例能找到 say，但找不到静态方法 create', () => {
    expect(resolveLookup(final, 'p', 'say').hitNodeId).toBe('Person.prototype')
    expect(resolveLookup(final, 'p', 'create').found).toBe(false)
  })

  it('实例与原型之间是 proto 边，函数与原型之间是 prototype 边', () => {
    expect(hasEdge(final, 'p', 'Person.prototype', 'proto')).toBe(true)
    expect(hasEdge(final, 'Person', 'Person.prototype', 'prototype')).toBe(true)
  })
})
