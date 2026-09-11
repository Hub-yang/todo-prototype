import { describe, expect, it } from 'vitest'
import { protoChain, replay, resolveLookup } from '~/core'
import { b4ObjectCreate } from '../b4-object-create'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 b4：Object.create', () => {
  const final = replay(b4ObjectCreate, b4ObjectCreate.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(b4ObjectCreate)
  })

  it('object.create(proto) 把新对象直接接到指定原型上', () => {
    expect(hasEdge(final, 'a', 'proto', 'proto')).toBe(true)
  })

  it('a 的完整链是 a → proto → Object.prototype', () => {
    expect(protoChain(final, 'a')).toEqual(['a', 'proto', 'Object.prototype'])
  })

  it('a 能用原型上的方法', () => {
    expect(resolveLookup(final, 'a', 'greet').hitNodeId).toBe('proto')
  })

  it('object.create(null) 造出的对象没有任何原型出边', () => {
    expect(final.edges.some(e => e.source === 'bare')).toBe(false)
    expect(protoChain(final, 'bare')).toEqual(['bare'])
  })

  it('无原型对象连 toString 都没有', () => {
    expect(resolveLookup(final, 'bare', 'toString').found).toBe(false)
  })
})
