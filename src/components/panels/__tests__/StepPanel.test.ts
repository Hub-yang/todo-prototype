import type { Step } from '~/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StepPanel from '../StepPanel.vue'

const step: Step = { title: '创建实例', narration: 'new 出一个对象', patch: [] }

function mountPanel(props: Partial<InstanceType<typeof StepPanel>['$props']> = {}) {
  return mount(StepPanel, {
    props: { step: 1, total: 3, current: step, playing: false, ...props },
  })
}

describe('stepPanel', () => {
  it('渲染步骤进度与讲解文案', () => {
    const w = mountPanel()
    expect(w.text()).toContain('1 / 3')
    expect(w.text()).toContain('new 出一个对象')
  })

  it('未播放时主按钮是播放图标，播放中是暂停图标', async () => {
    expect(mountPanel().find('[data-play] > *').classes()).toContain('i-ph-play-fill')
    expect(mountPanel({ playing: true }).find('[data-play] > *').classes()).toContain('i-ph-pause-fill')
  })

  it('上一步 / 下一步用左右尖角图标', () => {
    const w = mountPanel()
    expect(w.find('[data-prev] > *').classes()).toContain('i-ph-caret-left-bold')
    expect(w.find('[data-next] > *').classes()).toContain('i-ph-caret-right-bold')
  })

  it('纯图标按钮带无障碍名，读屏不会念到空按钮', () => {
    const w = mountPanel()
    expect(w.find('[data-prev]').attributes('aria-label')).toBeTruthy()
    expect(w.find('[data-next]').attributes('aria-label')).toBeTruthy()
    expect(w.find('[data-collapse]').attributes('aria-label')).toBeTruthy()
  })

  it('折叠开关展开时朝下、折叠后朝上', async () => {
    const w = mountPanel()
    expect(w.find('[data-collapse] > *').classes()).toContain('i-ph-caret-down-bold')
    await w.find('[data-collapse]').trigger('click')
    expect(w.find('[data-collapse] > *').classes()).toContain('i-ph-caret-up-bold')
  })

  it('第 0 步时上一步禁用，末步时下一步禁用', () => {
    expect(mountPanel({ step: 0 }).find('[data-prev]').attributes('disabled')).toBeDefined()
    expect(mountPanel({ step: 3 }).find('[data-next]').attributes('disabled')).toBeDefined()
  })

  it('派发翻页与播放事件', async () => {
    const w = mountPanel()
    await w.find('[data-next]').trigger('click')
    await w.find('[data-play]').trigger('click')
    expect(w.emitted('next')).toHaveLength(1)
    expect(w.emitted('togglePlay')).toHaveLength(1)
  })

  it('没有当前步时提示用方向键图标，而不是 ← → 字符', () => {
    const w = mountPanel({ current: null })
    expect(w.html()).toContain('i-ph-caret-left-bold')
    expect(w.text()).not.toContain('←')
  })
})
