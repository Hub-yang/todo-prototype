import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CodePanel from '../CodePanel.vue'

const code = 'function Person(name) {\n  this.name = name\n}\nconst p1 = new Person(\'Ada\')'

describe('codePanel', () => {
  it('按行渲染代码', () => {
    expect(mount(CodePanel, { props: { code } }).findAll('[data-line]')).toHaveLength(4)
  })

  it('高亮区间内的行被标记', () => {
    const lines = mount(CodePanel, { props: { code, highlight: [1, 3] } }).findAll('[data-line]')
    expect(lines[0].attributes('data-active')).toBe('true')
    expect(lines[2].attributes('data-active')).toBe('true')
    expect(lines[3].attributes('data-active')).toBe('false')
  })

  it('单行高亮只命中那一行', () => {
    const lines = mount(CodePanel, { props: { code, highlight: [4, 4] } }).findAll('[data-line]')
    expect(lines[3].attributes('data-active')).toBe('true')
    expect(lines[0].attributes('data-active')).toBe('false')
  })

  it('不传 highlight 时没有任何行被高亮', () => {
    expect(mount(CodePanel, { props: { code } }).findAll('[data-active="true"]')).toHaveLength(0)
  })

  it('可折叠', async () => {
    const w = mount(CodePanel, { props: { code } })
    await w.find('[data-collapse]').trigger('click')
    expect(w.findAll('[data-line]')).toHaveLength(0)
  })

  it('空行也占一行，不会塌陷', () => {
    const w = mount(CodePanel, { props: { code: 'a\n\nb' } })
    expect(w.findAll('[data-line]')).toHaveLength(3)
  })

  it('折叠开关用尖角图标，展开朝下、折叠朝右', async () => {
    const w = mount(CodePanel, { props: { code } })
    expect(w.find('[data-collapse] > *').classes()).toContain('i-ph-caret-down-bold')
    await w.find('[data-collapse]').trigger('click')
    expect(w.find('[data-collapse] > *').classes()).toContain('i-ph-caret-right-bold')
  })

  it('纯图标的折叠按钮带无障碍名', () => {
    const w = mount(CodePanel, { props: { code } })
    expect(w.find('[data-collapse]').attributes('aria-label')).toBeTruthy()
  })
})
