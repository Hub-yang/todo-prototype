import type { GraphState } from './types'

export interface LayoutOptions {
  colWidth?: number
  rowHeight?: number
}

export interface Point { x: number, y: number }

/**
 * 分层布局：纵轴是原型链深度，横轴是同层分支。
 * 只用 proto 边计算深度——prototype / constructor 边不影响层级。
 */
export function layout(graph: GraphState, opts: LayoutOptions = {}): Map<string, Point> {
  const colWidth = opts.colWidth ?? 260
  const rowHeight = opts.rowHeight ?? 170

  const nodeIds = new Set(graph.nodes.map(n => n.id))

  const protoTarget = new Map<string, string>()
  for (const e of graph.edges) {
    if (e.kind === 'proto')
      protoTarget.set(e.source, e.target)
  }

  const depthCache = new Map<string, number>()

  function depthOf(id: string, visiting: Set<string>): number {
    const cached = depthCache.get(id)
    if (cached !== undefined)
      return cached

    if (visiting.has(id)) {
      // proto 边在 JS 中不可能成环，走到这里说明场景数据有误
      console.warn(`[layout] 检测到 proto 边成环，涉及节点：${id}`)
      depthCache.set(id, 0)
      return 0
    }

    const target = protoTarget.get(id)
    // 指向图外的边不参与深度计算，否则会算出没有节点承载的层级
    if (!target || !nodeIds.has(target)) {
      depthCache.set(id, 0)
      return 0
    }

    visiting.add(id)
    const d = depthOf(target, visiting) + 1
    visiting.delete(id)
    depthCache.set(id, d)
    return d
  }

  for (const n of graph.nodes)
    depthOf(n.id, new Set())

  // 同层内按节点数组顺序横向排开，顺序稳定，步进时不会乱跳
  const seatByDepth = new Map<number, number>()
  const pos = new Map<string, Point>()

  for (const n of graph.nodes) {
    const d = depthCache.get(n.id) ?? 0
    const seat = seatByDepth.get(d) ?? 0
    seatByDepth.set(d, seat + 1)
    // 深度 0 是链末端（Object.prototype 一侧），放最上面；越往下越靠近实例
    pos.set(n.id, { x: seat * colWidth, y: d * rowHeight })
  }

  // 函数节点贴着它的 prototype 节点放：同一行、左边一列
  for (const e of graph.edges) {
    if (e.kind !== 'prototype')
      continue
    const fn = pos.get(e.source)
    const proto = pos.get(e.target)
    if (!fn || !proto)
      continue

    let x = proto.x - colWidth
    const taken = (px: number) =>
      [...pos.entries()].some(([id, p]) => id !== e.source && p.x === px && p.y === proto.y)
    while (taken(x))
      x -= colWidth

    pos.set(e.source, { x, y: proto.y })
  }

  return pos
}

export interface Bounds { x: number, y: number, width: number, height: number }

/** 一个节点在布局中占据的名义格子尺寸，用于推算图的整体边界 */
export const NODE_CELL = { width: 240, height: 120 }

/**
 * 由布局坐标推算整张图的边界。
 *
 * 视口适配必须基于这份坐标，而不是 Vue Flow 测量出的节点尺寸：
 * 后者是异步的，冷启动时常停在 0×0，导致 fitView 算不出边界而静默失效。
 */
export function graphBounds(
  positions: Map<string, { x: number, y: number }>,
  cell: { width: number, height: number } = NODE_CELL,
): Bounds {
  if (positions.size === 0)
    return { x: 0, y: 0, width: 0, height: 0 }

  const points = [...positions.values()]
  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))
  const minY = Math.min(...points.map(p => p.y))
  const maxY = Math.max(...points.map(p => p.y))

  return {
    x: minX,
    y: minY,
    width: maxX - minX + cell.width,
    height: maxY - minY + cell.height,
  }
}
