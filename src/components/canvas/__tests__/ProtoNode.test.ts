import type { ProtoNode as ProtoNodeData } from '~/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProtoNode from '../ProtoNode.vue'

const node: ProtoNodeData = {
  id: 'Person.prototype',
  label: 'Person.prototype',
  kind: 'prototype',
  props: [
    { key: 'constructor', value: 'ƒ Person', kind: 'data', refTo: 'Person' },
    { key: 'say', value: 'ƒ', kind: 'data' },
    { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
  ],
}

function mountNode(data: Partial<{ node: ProtoNodeData, dimmed: boolean, highlighted: boolean }> = {}) {
  return mount(ProtoNode, {
    props: { id: node.id, data: { node, dimmed: false, highlighted: false, ...data } },
    global: { stubs: { Handle: true } },
  })
}

describe('protoNode', () => {
  it('渲染标题与全部属性行', () => {
    const w = mountNode()
    expect(w.text()).toContain('Person.prototype')
    expect(w.findAll('[data-prop-row]')).toHaveLength(3)
  })

  it('折叠后不渲染属性行', async () => {
    const w = mountNode()
    await w.find('[data-node-header]').trigger('click')
    expect(w.findAll('[data-prop-row]')).toHaveLength(0)
  })

  it('dimmed 时带上淡化标记', () => {
    expect(mountNode({ dimmed: true }).find('[data-node]').attributes('data-dimmed')).toBe('true')
  })

  it('highlighted 时带上高亮标记', () => {
    expect(mountNode({ highlighted: true }).find('[data-node]').attributes('data-highlighted')).toBe('true')
  })

  it('点击引用型属性行会派发 focus-ref 事件', async () => {
    const w = mountNode()
    await w.findAll('[data-prop-row]')[0].trigger('click')
    expect(w.emitted('focusRef')?.[0]).toEqual(['Person'])
  })

  it('点击无引用的属性行不会派发事件', async () => {
    const w = mountNode()
    await w.findAll('[data-prop-row]')[1].trigger('click')
    expect(w.emitted('focusRef')).toBeUndefined()
  })

  it('内部槽属性行带上区分标记，便于单独着色', () => {
    const rows = mountNode().findAll('[data-prop-row]')
    expect(rows[2].attributes('data-internal')).toBe('true')
    expect(rows[1].attributes('data-internal')).toBe('false')
  })

  it('节点 kind 落到 DOM 上，供样式区分函数与实例', () => {
    expect(mountNode().find('[data-node]').attributes('data-kind')).toBe('prototype')
  })

  it('meta.collapsed 为 true 时初始即折叠', () => {
    const w = mountNode({ node: { ...node, meta: { collapsed: true } } })
    expect(w.findAll('[data-prop-row]')).toHaveLength(0)
  })
})
