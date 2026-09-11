import type { GraphState } from './types'

export interface LookupResult {
  found: boolean
  hitNodeId: string | null
  /** 依次经过的 proto 边 id，用于流光动画 */
  edgePath: string[]
  /** 依次经过的节点 id，用于逐跳高亮 */
  nodePath: string[]
}

function protoEdgeOf(graph: GraphState, id: string) {
  return graph.edges.find(e => e.kind === 'proto' && e.source === id)
}

/** 从起点出发，沿 proto 边走到链末端，返回经过的节点 id 序列 */
export function protoChain(graph: GraphState, startId: string): string[] {
  if (!graph.nodes.some(n => n.id === startId))
    return []

  const chain: string[] = [startId]
  const seen = new Set<string>([startId])
  let cur = startId

  while (true) {
    const edge = protoEdgeOf(graph, cur)
    // 数据成环时 seen 会兜住，不会死循环
    if (!edge || seen.has(edge.target))
      break
    if (!graph.nodes.some(n => n.id === edge.target))
      break
    chain.push(edge.target)
    seen.add(edge.target)
    cur = edge.target
  }

  return chain
}

/**
 * 模拟属性读取：从 startId 起沿原型链逐跳查找 key，命中即停。
 * 内部槽（kind === 'internal'）不参与查找——[[Prototype]] 不是可读属性。
 */
export function resolveLookup(graph: GraphState, startId: string, key: string): LookupResult {
  const nodePath: string[] = []
  const edgePath: string[] = []
  let cur: string | undefined = startId

  while (cur) {
    const node = graph.nodes.find(n => n.id === cur)
    if (!node)
      break

    nodePath.push(node.id)
    const hit = node.props.find(p => p.key === key && p.kind !== 'internal')
    if (hit)
      return { found: true, hitNodeId: node.id, edgePath, nodePath }

    const edge = protoEdgeOf(graph, node.id)
    if (!edge || nodePath.includes(edge.target))
      break
    edgePath.push(edge.id)
    cur = edge.target
  }

  return { found: false, hitNodeId: null, edgePath, nodePath }
}
