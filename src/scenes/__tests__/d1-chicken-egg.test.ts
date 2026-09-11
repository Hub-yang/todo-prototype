import { describe, expect, it } from 'vitest'
import { layout, protoChain, replay } from '~/core'
import { d1ChickenEgg } from '../d1-chicken-egg'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 d1：Object 与 Function 的环', () => {
  const final = replay(d1ChickenEgg, d1ChickenEgg.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(d1ChickenEgg)
  })

  it('object 是函数，原型是 Function.prototype', () => {
    expect(hasEdge(final, 'Object', 'Function.prototype', 'proto')).toBe(true)
  })

  it('function 自己的原型也是 Function.prototype——这就是那个环', () => {
    expect(hasEdge(final, 'Function', 'Function.prototype', 'proto')).toBe(true)
  })

  it('function.prototype 本身是个对象，原型是 Object.prototype', () => {
    expect(hasEdge(final, 'Function.prototype', 'Object.prototype', 'proto')).toBe(true)
  })

  it('function 的 prototype 属性与它的 [[Prototype]] 指向同一个对象', () => {
    const asProperty = final.edges.find(e => e.source === 'Function' && e.kind === 'prototype')!
    const asProto = final.edges.find(e => e.source === 'Function' && e.kind === 'proto')!
    expect(asProperty.target).toBe(asProto.target)
  })

  it('尽管图上有环形观感，proto 链本身仍是有限的', () => {
    expect(protoChain(final, 'Function')).toEqual(['Function', 'Function.prototype', 'Object.prototype'])
  })

  it('布局算法能处理这张图，每个节点都拿到坐标', () => {
    const pos = layout(final)
    expect(pos.size).toBe(final.nodes.length)
  })
})
