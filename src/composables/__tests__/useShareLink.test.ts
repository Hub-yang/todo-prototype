import { describe, expect, it } from 'vitest'
import { buildShareUrl, parseShareQuery } from '../useShareLink'

describe('buildShareUrl', () => {
  it('拼出带场景、步骤与主题的深链', () => {
    expect(buildShareUrl('https://x.dev', 'a2', 3, 'neon'))
      .toBe('https://x.dev/#/s/a2?step=3&theme=neon')
  })

  it('去掉 origin 末尾多余的斜杠', () => {
    expect(buildShareUrl('https://x.dev/', 'a2', 0, 'aurora'))
      .toBe('https://x.dev/#/s/a2?step=0&theme=aurora')
  })

  it('第 0 步也照常写进链接，便于分享「起始状态」', () => {
    expect(buildShareUrl('https://x.dev', 'b1', 0, 'aurora')).toContain('step=0')
  })
})

describe('parseShareQuery', () => {
  it('解析合法参数', () => {
    expect(parseShareQuery({ step: '4', theme: 'neon' })).toEqual({ step: 4, theme: 'neon' })
  })

  it('缺省时 step 为 0、theme 为 null', () => {
    expect(parseShareQuery({})).toEqual({ step: 0, theme: null })
  })

  it('非法 step 归零', () => {
    expect(parseShareQuery({ step: 'abc' }).step).toBe(0)
    expect(parseShareQuery({ step: '-5' }).step).toBe(0)
    expect(parseShareQuery({ step: '1.5' }).step).toBe(0)
  })

  it('非法或不可切换的主题被忽略', () => {
    expect(parseShareQuery({ theme: 'rainbow' }).theme).toBeNull()
    // paper 只用于导出，不接受从链接切入
    expect(parseShareQuery({ theme: 'paper' }).theme).toBeNull()
  })

  it('vue-router 传来的数组型查询参数不会让它崩溃', () => {
    expect(() => parseShareQuery({ step: ['1', '2'] })).not.toThrow()
  })
})
