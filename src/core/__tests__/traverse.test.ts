import type { GraphState } from '../types'
import { describe, expect, it } from 'vitest'
import { protoChain, resolveLookup } from '../traverse'

function graph(): GraphState {
  return {
    nodes: [
      { id: 'p1', label: 'p1', kind: 'instance', props: [{ key: 'name', value: '\'Ada\'', kind: 'data' }] },
      { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [{ key: 'say', value: 'ƒ', kind: 'data' }] },
      { id: 'Object.prototype', label: 'Object.prototype', kind: 'prototype', props: [{ key: 'toString', value: 'ƒ', kind: 'data' }] },
    ],
    edges: [
      { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
      { id: 'e2', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto' },
    ],
  }
}

describe('protoChain', () => {
  it('返回从起点到链末端的完整节点序列', () => {
    expect(protoChain(graph(), 'p1')).toEqual(['p1', 'Person.prototype', 'Object.prototype'])
  })

  it('起点不存在时返回空数组', () => {
    expect(protoChain(graph(), '不存在')).toEqual([])
  })

  it('从链中段出发，只返回它往上的部分', () => {
    expect(protoChain(graph(), 'Person.prototype')).toEqual(['Person.prototype', 'Object.prototype'])
  })

  it('数据成环时不会死循环', () => {
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'plain', props: [] },
        { id: 'b', label: 'b', kind: 'plain', props: [] },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', kind: 'proto' },
        { id: 'e2', source: 'b', target: 'a', kind: 'proto' },
      ],
    }
    expect(protoChain(g, 'a')).toEqual(['a', 'b'])
  })

  it('只跟随 proto 边，不跟随 prototype 边', () => {
    const g = graph()
    g.nodes.push({ id: 'Person', label: 'Person', kind: 'function', props: [] })
    g.edges.push({ id: 'e3', source: 'Person', target: 'Person.prototype', kind: 'prototype' })
    expect(protoChain(g, 'Person')).toEqual(['Person'])
  })
})

describe('resolveLookup', () => {
  it('自身命中时不产生跳转', () => {
    const r = resolveLookup(graph(), 'p1', 'name')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('p1')
    expect(r.edgePath).toEqual([])
    expect(r.nodePath).toEqual(['p1'])
  })

  it('沿链找到时记录经过的边', () => {
    const r = resolveLookup(graph(), 'p1', 'say')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('Person.prototype')
    expect(r.edgePath).toEqual(['e1'])
    expect(r.nodePath).toEqual(['p1', 'Person.prototype'])
  })

  it('走到链末端仍未找到时 found 为 false', () => {
    const r = resolveLookup(graph(), 'p1', '不存在的属性')
    expect(r.found).toBe(false)
    expect(r.hitNodeId).toBeNull()
    expect(r.edgePath).toEqual(['e1', 'e2'])
  })

  it('内部槽（internal）不参与属性查找', () => {
    const g = graph()
    g.nodes[1].props.push({ key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' })
    const r = resolveLookup(g, 'p1', '[[Prototype]]')
    expect(r.found).toBe(false)
  })

  it('命中即停，不会继续往上找同名属性', () => {
    const g = graph()
    // 让链上更高处也有一个 say，确认查找停在更近的那个
    g.nodes[2].props.push({ key: 'say', value: 'ƒ (更高处的)', kind: 'data' })
    const r = resolveLookup(g, 'p1', 'say')
    expect(r.hitNodeId).toBe('Person.prototype')
    expect(r.nodePath).toEqual(['p1', 'Person.prototype'])
  })

  it('起点不存在时返回未命中', () => {
    const r = resolveLookup(graph(), '不存在', 'name')
    expect(r.found).toBe(false)
    expect(r.nodePath).toEqual([])
  })
})
