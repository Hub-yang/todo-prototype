import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '~/App.vue'
import { useTheme } from '~/composables/useTheme'

function mountApp() {
  return mount(App, { global: { stubs: { RouterView: true } } })
}

describe('app 主题切换', () => {
  // 主题是模块级单例，用例之间会互相污染，每次先复位
  beforeEach(() => useTheme().setTheme('aurora'))

  it('极光主题显示太阳图标，切到霓虹显示月亮图标', async () => {
    const w = mountApp()
    expect(w.find('[data-theme-icon]').classes()).toContain('i-ph-sun-bold')

    await w.find('[data-theme-toggle]').trigger('click')

    expect(w.find('[data-theme-icon]').classes()).toContain('i-ph-moon-stars-bold')
  })

  it('切换按钮保留文字标签，图标只是补充', () => {
    expect(mountApp().find('[data-theme-toggle]').text()).toContain('极光')
  })

  it('图标按钮带无障碍名', () => {
    expect(mountApp().find('[data-theme-toggle]').attributes('aria-label')).toBeTruthy()
  })
})
