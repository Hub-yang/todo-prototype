import type { EdgeKind, GraphState, Scene } from '~/core'
import { expect } from 'vitest'
import { replay } from '~/core'

export function hasEdge(g: GraphState, source: string, target: string, kind: EdgeKind): boolean {
  return g.edges.some(e => e.source === source && e.target === target && e.kind === kind)
}

/**
 * 每个场景都要通过的通用检查。
 * 这些错误肉眼极难发现：悬空边会让连线指向不存在的节点，
 * traverse 引用了不存在的边会让流光动画悄悄失效。
 */
export function expectSceneIntegrity(scene: Scene): void {
  const final = replay(scene, scene.steps.length)
  const nodeIds = new Set(final.nodes.map(n => n.id))
  const edgeIds = new Set(final.edges.map(e => e.id))

  expect(scene.steps.length).toBeGreaterThan(0)

  for (const step of scene.steps) {
    expect(step.narration.length).toBeGreaterThan(0)
    expect(step.codeRange).toBeDefined()

    for (const id of step.traverse ?? [])
      expect(edgeIds.has(id), `traverse 引用了不存在的边：${id}`).toBe(true)

    for (const id of step.focus?.nodes ?? [])
      expect(nodeIds.has(id), `focus 引用了不存在的节点：${id}`).toBe(true)
  }

  for (const e of final.edges) {
    expect(nodeIds.has(e.source), `边 ${e.id} 的起点不存在：${e.source}`).toBe(true)
    expect(nodeIds.has(e.target), `边 ${e.id} 的终点不存在：${e.target}`).toBe(true)
  }

  // 属性行声明的引用也必须落到真实节点上
  for (const n of final.nodes) {
    for (const p of n.props) {
      if (p.refTo)
        expect(nodeIds.has(p.refTo), `${n.id}.${p.key} 引用了不存在的节点：${p.refTo}`).toBe(true)
    }
  }
}
