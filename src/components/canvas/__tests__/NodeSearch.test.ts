import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NodeSearch from '../NodeSearch.vue'

const nodes = [
  { id: 'Array', label: 'Array' },
  { id: 'Array.prototype', label: 'Array.prototype' },
  { id: 'Date', label: 'Date' },
  { id: 'Object.prototype', label: 'Object.prototype' },
]

describe('nodeSearch', () => {
  it('不输入时不列出任何候选，避免遮挡画布', () => {
    const w = mount(NodeSearch, { props: { nodes } })
    expect(w.findAll('[data-hit]')).toHaveLength(0)
  })

  it('按输入过滤，忽略大小写', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('arr')
    expect(w.findAll('[data-hit]')).toHaveLength(2)
  })

  it('点击候选项派发 pick 事件', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('date')
    await w.find('[data-hit]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual(['Date'])
  })

  it('无匹配时给出提示而不是空白', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('不存在的东西')
    expect(w.findAll('[data-hit]')).toHaveLength(0)
    expect(w.text()).toContain('没有匹配')
  })

  it('选中后清空输入，方便连续搜索', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('date')
    await w.find('[data-hit]').trigger('click')
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
  })
})
