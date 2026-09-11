import type { GraphPatch, GraphState, ProtoNode, Scene } from './types'

/** 找节点，找不到就抛错——场景数据写错要尽早暴露，而不是静默吞掉 */
function mustFind(graph: GraphState, id: string): ProtoNode {
  const node = graph.nodes.find(n => n.id === id)
  if (!node)
    throw new Error(`节点不存在：${id}`)
  return node
}

/** 对单个节点做不可变更新 */
function mapNode(graph: GraphState, id: string, fn: (n: ProtoNode) => ProtoNode): GraphState {
  mustFind(graph, id)
  return {
    ...graph,
    nodes: graph.nodes.map(n => (n.id === id ? fn(n) : n)),
  }
}

/** 施加一个 patch，返回新图，绝不修改入参 */
export function applyPatch(graph: GraphState, patch: GraphPatch): GraphState {
  switch (patch.op) {
    case 'addNode':
      return { ...graph, nodes: [...graph.nodes, patch.node] }

    case 'removeNode':
      return {
        nodes: graph.nodes.filter(n => n.id !== patch.id),
        // 节点删除时，挂在它上面的边一并删除，避免出现悬空边
        edges: graph.edges.filter(e => e.source !== patch.id && e.target !== patch.id),
      }

    case 'updateNode':
      return mapNode(graph, patch.id, n => ({ ...n, ...patch.patch }))

    case 'addEdge':
      return { ...graph, edges: [...graph.edges, patch.edge] }

    case 'removeEdge':
      return { ...graph, edges: graph.edges.filter(e => e.id !== patch.id) }

    case 'addProp':
      return mapNode(graph, patch.nodeId, n => ({ ...n, props: [...n.props, patch.prop] }))

    case 'updateProp':
      return mapNode(graph, patch.nodeId, n => ({
        ...n,
        props: n.props.map(p => (p.key === patch.key ? { ...p, ...patch.patch } : p)),
      }))

    case 'removeProp':
      return mapNode(graph, patch.nodeId, n => ({
        ...n,
        props: n.props.filter(p => p.key !== patch.key),
      }))
  }
}

/**
 * 第 n 步的图 = 初始图重放前 n 步的 patch。
 * 采用重放而非快照，后退无需实现逆操作。
 */
export function replay(scene: Scene, step: number): GraphState {
  const n = Math.max(0, Math.min(step, scene.steps.length))
  return scene.steps
    .slice(0, n)
    .flatMap(s => s.patch)
    .reduce(applyPatch, scene.initial)
}
