import { toPng } from 'html-to-image'

/**
 * 导出画布为 PNG。
 *
 * 刻意先切到 paper 主题再截图：html-to-image 对 backdrop-filter 与 drop-shadow
 * 的还原本就不可靠，与其和它搏斗，不如导出一张本来就为白底博客设计的图。
 */
export async function exportPng(el: HTMLElement, filename: string): Promise<void> {
  const root = document.documentElement
  const previous = root.dataset.theme ?? 'aurora'
  root.dataset.theme = 'paper'

  try {
    // 等一帧，确保切换主题后的样式已经应用
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))

    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      cacheBust: true,
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  }
  finally {
    // 无论成败都要还原，否则用户会莫名其妙停在白色主题里
    root.dataset.theme = previous
  }
}
