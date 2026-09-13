import { describe, expect, it } from 'vitest'
import { graphBounds, layout, protoChain, replay } from '~/core'
import { d2Builtins } from '../d2-builtins'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 d2：内置对象全景图', () => {
  const final = replay(d2Builtins, d2Builtins.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(d2Builtins)
  })

  it('覆盖常用内置构造函数', () => {
    const ids = new Set(final.nodes.map(n => n.id))
    for (const name of ['Array', 'Date', 'RegExp', 'Error', 'Map', 'Set'])
      expect(ids.has(name), `缺少内置对象：${name}`).toBe(true)
  })

  it('每个内置构造函数都有自己的 prototype 对象', () => {
    for (const name of ['Array', 'Date', 'RegExp', 'Error', 'Map', 'Set'])
      expect(hasEdge(final, name, `${name}.prototype`, 'prototype')).toBe(true)
  })

  it('所有内置原型最终都汇到 Object.prototype', () => {
    for (const name of ['Array', 'Date', 'RegExp', 'Error', 'Map', 'Set'])
      expect(protoChain(final, `${name}.prototype`)).toContain('Object.prototype')
  })

  it('实例示例挂在对应的原型上', () => {
    expect(hasEdge(final, 'arr', 'Array.prototype', 'proto')).toBe(true)
  })

  it('节点规模足够大，确实需要折叠与搜索', () => {
    expect(final.nodes.length).toBeGreaterThanOrEqual(15)
  })

  it('内置构造函数默认折叠，否则一屏放不下', () => {
    const builtinCtors = final.nodes.filter(n => n.kind === 'function' && n.meta?.builtin)
    expect(builtinCtors.length).toBeGreaterThan(0)
    expect(builtinCtors.every(n => n.meta?.collapsed === true)).toBe(true)
  })

  it('布局算法能给这张大图的每个节点排出坐标', () => {
    expect(layout(final).size).toBe(final.nodes.length)
  })

  it('整张图不横向失控，缩放后仍能看清骨架', () => {
    // 7 个构造函数横排时图宽 3640px，1440 视口整体适配后缩放只剩 0.27；
    // 构造函数改为竖排后宽度腰斩，缩放回到 0.4 以上。
    const width = graphBounds(layout(final)).width
    expect(width).toBeLessThan(2200)
  })

  it('没有两个节点被排到同一个坐标上', () => {
    const seen = new Set<string>()
    for (const [id, pt] of layout(final)) {
      const key = `${pt.x},${pt.y}`
      expect(seen.has(key), `${id} 与另一个节点同处 ${key}`).toBe(false)
      seen.add(key)
    }
  })
})
