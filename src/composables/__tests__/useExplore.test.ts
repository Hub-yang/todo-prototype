import type { GraphState } from '~/core'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useExplore } from '../useExplore'

const graph: GraphState = {
  nodes: [
    { id: 'p1', label: 'p1', kind: 'instance', props: [] },
    { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
    { id: 'Object.prototype', label: 'Object.prototype', kind: 'prototype', props: [] },
    { id: 'other', label: 'other', kind: 'plain', props: [] },
  ],
  edges: [
    { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
    { id: 'e2', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto' },
  ],
}

describe('useExplore', () => {
  it('未 hover 时不高亮也不淡化', () => {
    const e = useExplore(ref(graph))
    expect(e.highlightedNodes.value).toEqual([])
    expect(e.dimmedNodes.value).toEqual([])
  })

  it('hover 节点时点亮它到链末端的整条链', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    expect(e.highlightedNodes.value).toEqual(['p1', 'Person.prototype', 'Object.prototype'])
  })

  it('链外节点被淡化', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    expect(e.dimmedNodes.value).toEqual(['other'])
  })

  it('hover 链中段时只点亮它往上的部分', () => {
    const e = useExplore(ref(graph))
    e.setHover('Person.prototype')
    expect(e.highlightedNodes.value).toEqual(['Person.prototype', 'Object.prototype'])
    expect(e.dimmedNodes.value).toEqual(expect.arrayContaining(['p1', 'other']))
  })

  it('取消 hover 后恢复', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    e.setHover(null)
    expect(e.dimmedNodes.value).toEqual([])
  })

  it('被点亮的链上的边同样返回，供连线一起高亮', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    expect(e.highlightedEdges.value).toEqual(['e1', 'e2'])
  })

  it('hover 孤立节点时只点亮它自己', () => {
    const e = useExplore(ref(graph))
    e.setHover('other')
    expect(e.highlightedNodes.value).toEqual(['other'])
    expect(e.highlightedEdges.value).toEqual([])
  })

  it('图发生变化后，高亮结果跟随新图重新计算', () => {
    const g = ref<GraphState>({
      nodes: [
        { id: 'a', label: 'a', kind: 'instance', props: [] },
        { id: 'b', label: 'b', kind: 'prototype', props: [] },
      ],
      edges: [],
    })
    const e = useExplore(g)
    e.setHover('a')
    expect(e.highlightedNodes.value).toEqual(['a'])

    g.value = { nodes: g.value.nodes, edges: [{ id: 'e1', source: 'a', target: 'b', kind: 'proto' }] }
    expect(e.highlightedNodes.value).toEqual(['a', 'b'])
  })
})
