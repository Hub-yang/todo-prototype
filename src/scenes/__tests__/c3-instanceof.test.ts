import { describe, expect, it } from 'vitest'
import { protoChain, replay } from '~/core'
import { c3Instanceof } from '../c3-instanceof'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 c3：instanceof 原理', () => {
  const final = replay(c3Instanceof, c3Instanceof.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(c3Instanceof)
  })

  it('d 的原型链上确实出现了 Animal.prototype，所以 d instanceof Animal 为真', () => {
    expect(protoChain(final, 'd')).toContain('Animal.prototype')
  })

  it('animal.prototype 由 Animal 的 prototype 属性指出', () => {
    expect(hasEdge(final, 'Animal', 'Animal.prototype', 'prototype')).toBe(true)
  })

  it('逐跳比对的演示路径覆盖了从 d 到 Animal.prototype 的每一跳', () => {
    const step = c3Instanceof.steps.find(s => s.title.includes('逐跳'))!
    expect(step.traverse).toEqual(['e-d-dogproto', 'e-dogproto-animalproto'])
  })

  it('无关的类不在链上，所以 instanceof 为假', () => {
    expect(protoChain(final, 'd')).not.toContain('Cat.prototype')
  })
})
