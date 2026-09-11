import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { d3Pollution } from '../d3-pollution'
import { expectSceneIntegrity } from './helpers'

describe('场景 d3：原型污染', () => {
  it('通过通用完整性检查', () => {
    expectSceneIntegrity(d3Pollution)
  })

  it('污染前，几个对象都查不到那个属性', () => {
    const g = replay(d3Pollution, 0)
    for (const id of ['userConfig', 'emptyObj', 'arr'])
      expect(resolveLookup(g, id, 'isAdmin').found).toBe(false)
  })

  it('污染只写了一个地方：Object.prototype', () => {
    const step = d3Pollution.steps.findIndex(s => s.title.includes('污染')) + 1
    const g = replay(d3Pollution, step)
    expect(g.nodes.find(n => n.id === 'Object.prototype')!.props.some(p => p.key === 'isAdmin')).toBe(true)
    // 三个对象自身都没有被直接修改过
    for (const id of ['userConfig', 'emptyObj', 'arr'])
      expect(g.nodes.find(n => n.id === id)!.props.some(p => p.key === 'isAdmin')).toBe(false)
  })

  it('但三个对象同时都「感染」了，因为链都通向那里', () => {
    const step = d3Pollution.steps.findIndex(s => s.title.includes('污染')) + 1
    const g = replay(d3Pollution, step)
    for (const id of ['userConfig', 'emptyObj', 'arr']) {
      const r = resolveLookup(g, id, 'isAdmin')
      expect(r.found, `${id} 应当被污染波及`).toBe(true)
      expect(r.hitNodeId).toBe('Object.prototype')
    }
  })

  it('用 Object.create(null) 造的对象免疫，因为它根本没有链', () => {
    const final = replay(d3Pollution, d3Pollution.steps.length)
    expect(resolveLookup(final, 'safeDict', 'isAdmin').found).toBe(false)
  })
})
