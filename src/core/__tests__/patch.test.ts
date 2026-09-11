import type { GraphState, Scene } from '../types'
import { describe, expect, it } from 'vitest'
import { applyPatch, replay } from '../patch'

function baseGraph(): GraphState {
  return {
    nodes: [{ id: 'p1', label: 'p1', kind: 'instance', props: [] }],
    edges: [],
  }
}

describe('applyPatch', () => {
  it('addNode 会新增节点', () => {
    const next = applyPatch(baseGraph(), {
      op: 'addNode',
      node: { id: 'Person', label: 'Person', kind: 'function', props: [] },
    })
    expect(next.nodes.map(n => n.id)).toEqual(['p1', 'Person'])
  })

  it('不可变：不得修改入参', () => {
    const g = baseGraph()
    const snapshot = JSON.stringify(g)
    applyPatch(g, { op: 'addProp', nodeId: 'p1', prop: { key: 'name', value: '\'Ada\'', kind: 'data' } })
    expect(JSON.stringify(g)).toBe(snapshot)
  })

  it('addProp 追加属性行', () => {
    const next = applyPatch(baseGraph(), {
      op: 'addProp',
      nodeId: 'p1',
      prop: { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
    })
    expect(next.nodes[0].props).toHaveLength(1)
    expect(next.nodes[0].props[0].refTo).toBe('Person.prototype')
  })

  it('removeNode 会连带删除相关的边', () => {
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'plain', props: [] },
        { id: 'b', label: 'b', kind: 'plain', props: [] },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', kind: 'proto' }],
    }
    const next = applyPatch(g, { op: 'removeNode', id: 'b' })
    expect(next.nodes.map(n => n.id)).toEqual(['a'])
    expect(next.edges).toHaveLength(0)
  })

  it('对不存在的节点做 addProp 会抛错', () => {
    expect(() => applyPatch(baseGraph(), {
      op: 'addProp',
      nodeId: '不存在',
      prop: { key: 'x', value: '1', kind: 'data' },
    })).toThrow(/不存在/)
  })

  it('updateNode 只改指定字段', () => {
    const next = applyPatch(baseGraph(), {
      op: 'updateNode',
      id: 'p1',
      patch: { label: 'p1 (已改名)' },
    })
    expect(next.nodes[0].label).toBe('p1 (已改名)')
    expect(next.nodes[0].kind).toBe('instance')
  })

  it('updateProp 按 key 定位并合并字段', () => {
    const g = applyPatch(baseGraph(), {
      op: 'addProp',
      nodeId: 'p1',
      prop: { key: 'name', value: 'undefined', kind: 'data' },
    })
    const next = applyPatch(g, {
      op: 'updateProp',
      nodeId: 'p1',
      key: 'name',
      patch: { value: '\'Ada\'' },
    })
    expect(next.nodes[0].props[0]).toEqual({ key: 'name', value: '\'Ada\'', kind: 'data' })
  })

  it('removeProp 按 key 删除属性行', () => {
    const g = applyPatch(baseGraph(), {
      op: 'addProp',
      nodeId: 'p1',
      prop: { key: 'name', value: '\'Ada\'', kind: 'data' },
    })
    expect(applyPatch(g, { op: 'removeProp', nodeId: 'p1', key: 'name' }).nodes[0].props).toHaveLength(0)
  })

  it('removeEdge 按 id 删除边', () => {
    const g: GraphState = {
      nodes: [{ id: 'a', label: 'a', kind: 'plain', props: [] }],
      edges: [{ id: 'e1', source: 'a', target: 'a', kind: 'proto' }],
    }
    expect(applyPatch(g, { op: 'removeEdge', id: 'e1' }).edges).toHaveLength(0)
  })
})

describe('replay', () => {
  const scene: Scene = {
    id: 'test',
    title: '测试场景',
    code: 'const p1 = {}',
    initial: baseGraph(),
    steps: [
      {
        title: '第一步',
        narration: '新增 Person',
        patch: [{ op: 'addNode', node: { id: 'Person', label: 'Person', kind: 'function', props: [] } }],
      },
      {
        title: '第二步',
        narration: '接链',
        patch: [{ op: 'addEdge', edge: { id: 'e1', source: 'p1', target: 'Person', kind: 'proto' } }],
      },
    ],
  }

  it('step=0 返回初始图', () => {
    expect(replay(scene, 0).nodes).toHaveLength(1)
  })

  it('step=1 应用第一步', () => {
    expect(replay(scene, 1).nodes).toHaveLength(2)
    expect(replay(scene, 1).edges).toHaveLength(0)
  })

  it('step=2 应用全部', () => {
    expect(replay(scene, 2).edges).toHaveLength(1)
  })

  it('重放不污染 initial（可反复调用）', () => {
    replay(scene, 2)
    expect(replay(scene, 0).nodes).toHaveLength(1)
  })

  it('越界的 step 会被夹到合法范围', () => {
    expect(replay(scene, 99).edges).toHaveLength(1)
    expect(replay(scene, -3).nodes).toHaveLength(1)
  })
})
