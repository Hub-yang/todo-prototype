import { describe, expect, it } from 'vitest'
import { graphBounds } from '../layout'

describe('graphBounds', () => {
  it('空图返回零尺寸边界', () => {
    expect(graphBounds(new Map())).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('单个节点的边界就是它自己占的那一格', () => {
    const pos = new Map([['a', { x: 10, y: 20 }]])
    expect(graphBounds(pos, { width: 200, height: 100 })).toEqual({ x: 10, y: 20, width: 200, height: 100 })
  })

  it('多个节点的边界覆盖全部节点', () => {
    const pos = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 260, y: 170 }],
    ])
    expect(graphBounds(pos, { width: 200, height: 100 })).toEqual({ x: 0, y: 0, width: 460, height: 270 })
  })

  it('支持负坐标：函数节点会被放到原型左侧，x 可能为负', () => {
    const pos = new Map([
      ['fn', { x: -260, y: 170 }],
      ['proto', { x: 0, y: 170 }],
    ])
    expect(graphBounds(pos, { width: 200, height: 100 })).toEqual({ x: -260, y: 170, width: 460, height: 100 })
  })

  it('不传格子尺寸时使用默认值，且边界必定大于零', () => {
    const b = graphBounds(new Map([['a', { x: 0, y: 0 }]]))
    expect(b.width).toBeGreaterThan(0)
    expect(b.height).toBeGreaterThan(0)
  })
})
