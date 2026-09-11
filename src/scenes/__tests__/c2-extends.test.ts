import { describe, expect, it } from 'vitest'
import { protoChain, replay, resolveLookup } from '~/core'
import { c2Extends } from '../c2-extends'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 c2：extends 的双链', () => {
  const final = replay(c2Extends, c2Extends.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(c2Extends)
  })

  it('实例链：Dog.prototype 接到 Animal.prototype 上', () => {
    expect(hasEdge(final, 'Dog.prototype', 'Animal.prototype', 'proto')).toBe(true)
  })

  it('静态链：Dog 自己接到 Animal 上', () => {
    // 这一条是本场景的核心，多数教程会漏掉
    expect(hasEdge(final, 'Dog', 'Animal', 'proto')).toBe(true)
  })

  it('实例的完整链穿过两级原型', () => {
    expect(protoChain(final, 'd')).toEqual(['d', 'Dog.prototype', 'Animal.prototype', 'Object.prototype'])
  })

  it('实例方法沿实例链继承', () => {
    expect(resolveLookup(final, 'd', 'breathe').hitNodeId).toBe('Animal.prototype')
  })

  it('静态方法沿静态链继承——这正是静态链存在的意义', () => {
    expect(resolveLookup(final, 'Dog', 'register').hitNodeId).toBe('Animal')
  })

  it('实例拿不到静态方法，因为它的链不经过构造函数', () => {
    expect(resolveLookup(final, 'd', 'register').found).toBe(false)
  })

  it('两条链是分开的：Dog 的链上没有 Dog.prototype', () => {
    expect(protoChain(final, 'Dog')).not.toContain('Dog.prototype')
  })
})
