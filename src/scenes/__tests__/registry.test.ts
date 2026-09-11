import { describe, expect, it } from 'vitest'
import { getScene, sceneGroups, scenes } from '../index'

describe('场景注册表', () => {
  it('一期共 13 个场景', () => {
    expect(scenes).toHaveLength(13)
  })

  it('场景 id 唯一', () => {
    expect(new Set(scenes.map(s => s.id)).size).toBe(scenes.length)
  })

  it('覆盖 spec 约定的全部场景 id', () => {
    const expected = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'd1', 'd2', 'd3']
    expect(scenes.map(s => s.id).sort()).toEqual(expected)
  })

  it('分成 A/B/C/D 四组', () => {
    expect(sceneGroups.map(g => g.id)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('每个场景都恰好属于一个分组', () => {
    const grouped = sceneGroups.flatMap(g => g.scenes)
    expect(grouped).toHaveLength(scenes.length)
    expect(new Set(grouped.map(s => s.id)).size).toBe(scenes.length)
  })

  it('分组按 id 前缀归类', () => {
    for (const group of sceneGroups) {
      for (const scene of group.scenes)
        expect(scene.id.startsWith(group.id.toLowerCase())).toBe(true)
    }
  })

  it('每组都有标题与一句话说明', () => {
    for (const g of sceneGroups) {
      expect(g.title.length).toBeGreaterThan(0)
      expect(g.subtitle.length).toBeGreaterThan(0)
    }
  })

  it('getScene 能按 id 取到场景，取不到时返回 undefined', () => {
    expect(getScene('c2')?.id).toBe('c2')
    expect(getScene('不存在')).toBeUndefined()
  })
})
