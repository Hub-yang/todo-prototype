import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const exportPng = vi.fn(async () => {})
vi.mock('~/utils/exportImage', () => ({ exportPng: () => exportPng() }))

const { default: ExportButton } = await import('../ExportButton.vue')

function mountButton() {
  return mount(ExportButton, {
    props: { target: document.createElement('div'), filename: 'a.png' },
  })
}

describe('exportButton', () => {
  it('常态显示下载图标与文案', () => {
    const w = mountButton()
    expect(w.find('[data-icon]').classes()).toContain('i-ph-download-simple-bold')
    expect(w.text()).toContain('导出图片')
  })

  it('导出失败时换成警告图标', async () => {
    exportPng.mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const w = mountButton()

    await w.find('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('导出失败'))

    expect(w.find('[data-icon]').classes()).toContain('i-ph-warning-circle-bold')
    vi.mocked(console.error).mockRestore()
  })
})
