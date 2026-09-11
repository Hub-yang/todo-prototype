import { describe, expect, it } from 'vitest'
import { protoChain, replay, resolveLookup } from '~/core'
import { b2ChainEnd } from '../b2-chain-end'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 b2：链的终点是 null', () => {
  const final = replay(b2ChainEnd, b2ChainEnd.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(b2ChainEnd)
  })

  it('终点被画成一个独立节点，而不只是一行文字', () => {
    const nullNode = final.nodes.find(n => n.kind === 'null')
    expect(nullNode).toBeDefined()
    expect(nullNode!.props).toHaveLength(0)
  })

  it('object.prototype 指向 null 节点', () => {
    expect(hasEdge(final, 'Object.prototype', 'null', 'proto')).toBe(true)
  })

  it('查找不存在的属性会走完整条链并失败', () => {
    const r = resolveLookup(final, 'o', 'fly')
    expect(r.found).toBe(false)
    expect(r.nodePath).toEqual(['o', 'Object.prototype', 'null'])
  })

  it('演示查找失败的那一步，流光路径等于引擎求解的路径', () => {
    const step = b2ChainEnd.steps.find(s => s.title.includes('undefined'))!
    expect(step.traverse).toEqual(resolveLookup(final, 'o', 'fly').edgePath)
  })

  it('null 之后没有任何出边，链真的到头了', () => {
    expect(protoChain(final, 'null')).toEqual(['null'])
  })
})
