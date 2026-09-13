import type { EdgeKind } from '~/core'
import { Position } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProtoEdge from '../ProtoEdge.vue'

function mountEdge(
  data: { kind: EdgeKind, flowing?: boolean, dimmed?: boolean, highlighted?: boolean, label?: string },
  overrides: Record<string, unknown> = {},
) {
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
      ...overrides,
    },
  })
}

/** 从标签的 transform 里取出它在画布坐标系中的落点 */
function labelPoint(wrapper: ReturnType<typeof mountEdge>) {
  const style = wrapper.find('.edge-label').attributes('style') ?? ''
  const m = style.match(/translate\((-?[\d.]+)px,\s?(-?[\d.]+)px\)\s?;?$/)
  if (!m)
    throw new Error(`标签没有 transform 落点：${style}`)
  return { x: Number(m[1]), y: Number(m[2]) }
}

/** 一个高 120 的节点，左上角落在 (x, y) */
function nodeAt(x: number, y: number) {
  return { position: { x, y }, dimensions: { width: 240, height: 120 } }
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

  it('跨层边的标签仍落在两端之间，偏向起点一侧', () => {
    // 下层节点的属性行 → 上层节点顶部：这是 12 个场景里最常见的一种边
    const { x, y } = labelPoint(mountEdge(
      { kind: 'proto', label: '[[Prototype]]' },
      {
        sourceX: 240,
        sourceY: 460,
        targetX: 120,
        targetY: 320,
        targetPosition: Position.Top,
        sourceNode: nodeAt(0, 400),
        targetNode: nodeAt(0, 200),
      },
    ))
    // 关键是没有被抬到目标节点上方——跨层边不该走同层那套规则
    expect(y).toBeGreaterThan(320)
    expect(y).toBeLessThan(460)
    // 落点固化为改动前的值，跨层边的观感必须一个像素都不变
    expect(x).toBeCloseTo(251.6, 1)
    expect(y).toBeCloseTo(413.6, 1)
  })

  it('同层边的标签抬到节点上方，不去挤两节点之间的缝隙', () => {
    // d1 的构图：两个节点同处 y=200 这一行，中间只有 20px 缝隙，
    // 而 [[Prototype]] 标签宽约 90px，塞进缝里必然压住相邻节点。
    const wrapper = mountEdge(
      { kind: 'proto', label: '[[Prototype]]' },
      {
        sourceX: 240,
        sourceY: 260,
        targetX: 260,
        targetY: 260,
        targetPosition: Position.Left,
        sourceNode: nodeAt(0, 200),
        targetNode: nodeAt(260, 200),
      },
    )
    const { x, y } = labelPoint(wrapper)

    // 抬到目标节点上边缘之上
    expect(y).toBeLessThan(200)
    // 但仍待在 rowHeight(170) − 节点高(120) = 50px 的行间空隙里，不飘到上一行去
    expect(y).toBeGreaterThan(150)
    // 水平方向落在两节点之间
    expect(x).toBe(250)
  })

  it('同层判定看的是节点所在的行，不是两端 handle 的高度差', () => {
    // 属性行位置不同会让两端 y 差出几十像素，但两个节点仍在同一行
    const wrapper = mountEdge(
      { kind: 'proto', label: '[[Prototype]]' },
      {
        sourceX: 240,
        sourceY: 290,
        targetX: 260,
        targetY: 240,
        targetPosition: Position.Left,
        sourceNode: nodeAt(0, 200),
        targetNode: nodeAt(260, 200),
      },
    )
    expect(labelPoint(wrapper).y).toBeLessThan(200)
  })

  it('同一对节点之间的两条同层边，标签不会叠在一起', () => {
    // d1 的教学点：Function.__proto__ === Function.prototype，
    // 于是同一对节点之间同时有 prototype 边和 proto 边，两个标签的落点必须岔开
    const between = {
      sourceX: 240,
      sourceY: 260,
      targetX: 260,
      targetY: 260,
      targetPosition: Position.Left,
      sourceNode: nodeAt(0, 200),
      targetNode: nodeAt(260, 200),
    }
    const proto = labelPoint(mountEdge({ kind: 'proto', label: '[[Prototype]]' }, between))
    const prototype = labelPoint(mountEdge({ kind: 'prototype', label: 'prototype' }, between))

    // 标签高 21px，错开量至少要够一整行
    expect(Math.abs(proto.y - prototype.y)).toBeGreaterThanOrEqual(21)
    // 两个都还在节点上方的行间空隙里
    expect(Math.max(proto.y, prototype.y)).toBeLessThan(200)
    expect(Math.min(proto.y, prototype.y)).toBeGreaterThan(140)
  })

  it('向下的跨层边，标签不落进源节点里', () => {
    // d1 的 Object --proto--> Function.prototype 是条罕见的向下边，
    // 按「往起点拉」的老算法，标签会正好落回 Object 节点内部
    const { y } = labelPoint(mountEdge(
      { kind: 'proto', label: '[[Prototype]]' },
      {
        sourceX: 240,
        sourceY: 260,
        targetX: 380,
        targetY: 370,
        targetPosition: Position.Top,
        sourceNode: nodeAt(0, 200),
        targetNode: nodeAt(260, 370),
      },
    ))

    // 源节点占 200~320 这一行，标签要落到它下方、目标行上方的空隙里
    expect(y).toBeGreaterThan(320)
    expect(y).toBeLessThan(370)
  })

  it('拿不到节点信息时退回原来的算法，不抛错', () => {
    expect(() => labelPoint(mountEdge({ kind: 'proto', label: 'prototype' }))).not.toThrow()
  })
})
