import type { EdgeKind } from '~/core'
import { Position } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProtoEdge from '../ProtoEdge.vue'

function mountEdge(data: { kind: EdgeKind, flowing?: boolean, dimmed?: boolean, highlighted?: boolean, label?: string }) {
  return mount(ProtoEdge, {
    props: {
      id: 'e1',
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: Position.Right,
      targetPosition: Position.Top,
      data: { flowing: false, dimmed: false, highlighted: false, ...data },
    },
  })
}

describe('protoEdge', () => {
  it('三种语义各自带上 kind 标记，供 CSS 取不同颜色', () => {
    for (const kind of ['proto', 'prototype', 'constructor'] as EdgeKind[])
      expect(mountEdge({ kind }).find('[data-edge]').attributes('data-kind')).toBe(kind)
  })

  it('静止时不带流光标记', () => {
    expect(mountEdge({ kind: 'proto' }).find('[data-edge]').attributes('data-flowing')).toBe('false')
  })

  it('flowing 时带上流光标记', () => {
    expect(mountEdge({ kind: 'proto', flowing: true }).find('[data-edge]').attributes('data-flowing')).toBe('true')
  })

  it('dimmed 时带上淡化标记', () => {
    expect(mountEdge({ kind: 'proto', dimmed: true }).find('[data-edge]').attributes('data-dimmed')).toBe('true')
  })

  it('有 label 时渲染文字', () => {
    expect(mountEdge({ kind: 'proto', label: '[[Prototype]]' }).text()).toContain('[[Prototype]]')
  })

  it('无 label 时不渲染标签元素', () => {
    expect(mountEdge({ kind: 'proto' }).find('.edge-label').exists()).toBe(false)
  })

  it('渲染出真实的路径元素', () => {
    expect(mountEdge({ kind: 'proto' }).find('path').exists()).toBe(true)
  })

  it('highlighted 时带上高亮标记，用于点亮整条链', () => {
    expect(mountEdge({ kind: 'proto', highlighted: true }).find('[data-edge]').attributes('data-highlighted')).toBe('true')
  })

  it('未高亮时不带高亮标记', () => {
    expect(mountEdge({ kind: 'proto' }).find('[data-edge]').attributes('data-highlighted')).toBe('false')
  })
})
