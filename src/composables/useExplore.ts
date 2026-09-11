import type { Ref } from 'vue'
import type { GraphState } from '~/core'
import { computed, ref } from 'vue'
import { protoChain } from '~/core'

/**
 * 探索式高亮：hover 任意节点，点亮它到链末端的整条原型链，其余淡化。
 * 这是「自己摸索出原型链」的核心交互。
 */
export function useExplore(graph: Ref<GraphState>) {
  const hoverId = ref<string | null>(null)

  const highlightedNodes = computed(() =>
    hoverId.value ? protoChain(graph.value, hoverId.value) : [])

  /** 链上相邻两节点之间的 proto 边，连线需要跟着一起亮 */
  const highlightedEdges = computed(() => {
    const chain = highlightedNodes.value
    if (chain.length < 2)
      return []

    const ids: string[] = []
    for (let i = 0; i < chain.length - 1; i++) {
      const edge = graph.value.edges.find(
        e => e.kind === 'proto' && e.source === chain[i] && e.target === chain[i + 1],
      )
      if (edge)
        ids.push(edge.id)
    }
    return ids
  })

  const dimmedNodes = computed(() => {
    if (!hoverId.value)
      return []
    const lit = new Set(highlightedNodes.value)
    return graph.value.nodes.filter(n => !lit.has(n.id)).map(n => n.id)
  })

  function setHover(id: string | null) {
    hoverId.value = id
  }

  return { hoverId, setHover, highlightedNodes, highlightedEdges, dimmedNodes }
}
