import { beforeEach, describe, expect, it, vi } from 'vitest'

// 显式写出参数签名，否则 vi.fn 会把参数元组推导成空，mock.calls[0][n] 无法取值
const toPng = vi.fn(
  async (_el: HTMLElement, _options?: Record<string, unknown>) => 'data:image/png;base64,AAAA',
)
vi.mock('html-to-image', () => ({
  toPng: (el: HTMLElement, options?: Record<string, unknown>) => toPng(el, options),
}))

const { exportPng } = await import('../exportImage')

describe('exportPng', () => {
  beforeEach(() => {
    toPng.mockClear()
    toPng.mockImplementation(async () => 'data:image/png;base64,AAAA')
    document.documentElement.dataset.theme = 'aurora'
  })

  it('导出期间临时切到 paper 主题，结束后还原', async () => {
    let themeDuringExport = ''
    toPng.mockImplementationOnce(async () => {
      themeDuringExport = document.documentElement.dataset.theme ?? ''
      return 'data:image/png;base64,AAAA'
    })

    await exportPng(document.createElement('div'), 'test.png')

    expect(themeDuringExport).toBe('paper')
    expect(document.documentElement.dataset.theme).toBe('aurora')
  })

  it('导出失败时也必须还原主题，否则用户会莫名停在白色主题里', async () => {
    toPng.mockRejectedValueOnce(new Error('boom'))
    await expect(exportPng(document.createElement('div'), 'test.png')).rejects.toThrow('boom')
    expect(document.documentElement.dataset.theme).toBe('aurora')
  })

  it('按 2 倍像素比导出，保证贴进博文足够清晰', async () => {
    await exportPng(document.createElement('div'), 'test.png')
    expect(toPng.mock.calls[0][1]).toMatchObject({ pixelRatio: 2 })
  })

  it('用传入的文件名触发下载', async () => {
    const click = vi.fn()
    const realCreate = document.createElement.bind(document)
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement
      if (tag === 'a')
        el.click = click
      return el
    })

    await exportPng(realCreate('div'), 'a2-step3.png')

    expect(click).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('导出的是传入的那个元素', async () => {
    const el = document.createElement('section')
    await exportPng(el, 'x.png')
    expect(toPng.mock.calls[0][0]).toBe(el)
  })
})
