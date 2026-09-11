import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { b3Shadowing } from '../b3-shadowing'
import { expectSceneIntegrity } from './helpers'

function propsOf(scene: typeof b3Shadowing, step: number, nodeId: string) {
  return replay(scene, step).nodes.find(n => n.id === nodeId)!.props.map(p => p.key)
}

describe('场景 b3：屏蔽（shadowing）', () => {
  it('通过通用完整性检查', () => {
    expectSceneIntegrity(b3Shadowing)
  })

  it('起初 name 只在原型上，实例自己没有', () => {
    expect(propsOf(b3Shadowing, 0, 'p1')).not.toContain('name')
    expect(propsOf(b3Shadowing, 0, 'Person.prototype')).toContain('name')
  })

  it('起初读 name 会命中原型', () => {
    const r = resolveLookup(replay(b3Shadowing, 0), 'p1', 'name')
    expect(r.hitNodeId).toBe('Person.prototype')
  })

  it('赋值之后，实例自己多出一个 name，而原型上的原封不动', () => {
    const step = b3Shadowing.steps.findIndex(s => s.title.includes('赋值')) + 1
    expect(propsOf(b3Shadowing, step, 'p1')).toContain('name')
    expect(propsOf(b3Shadowing, step, 'Person.prototype')).toContain('name')
  })

  it('赋值之后读 name 命中实例自己，不再上溯', () => {
    const step = b3Shadowing.steps.findIndex(s => s.title.includes('赋值')) + 1
    const r = resolveLookup(replay(b3Shadowing, step), 'p1', 'name')
    expect(r.hitNodeId).toBe('p1')
    expect(r.edgePath).toHaveLength(0)
  })

  it('delete 掉实例的属性后，原型上的重新可见', () => {
    const final = replay(b3Shadowing, b3Shadowing.steps.length)
    expect(final.nodes.find(n => n.id === 'p1')!.props.map(p => p.key)).not.toContain('name')
    expect(resolveLookup(final, 'p1', 'name').hitNodeId).toBe('Person.prototype')
  })

  it('全程原型上的 name 值从未被改动过', () => {
    const valueAt = (step: number) =>
      replay(b3Shadowing, step).nodes.find(n => n.id === 'Person.prototype')!.props.find(p => p.key === 'name')!.value

    const values = b3Shadowing.steps.map((_, i) => valueAt(i + 1))
    expect(new Set(values).size).toBe(1)
  })
})
