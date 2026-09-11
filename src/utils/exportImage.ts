import { toPng } from 'html-to-image'

/** 导出兜底超时：截图卡住时也必须把主题还回去 */
const DEFAULT_TIMEOUT_MS = 15000

export interface ExportOptions {
  timeoutMs?: number
}

async function withTimeout<T>(task: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`导出超时（${ms}ms）`)), ms)
  })

  try {
    return await Promise.race([task, timeout])
  }
  finally {
    clearTimeout(timer)
  }
}

/**
 * 导出画布为 PNG。
 *
 * 刻意先切到 paper 主题再截图：html-to-image 对 backdrop-filter 与 drop-shadow
 * 的还原本就不可靠，与其和它搏斗，不如导出一张本来就为白底博客设计的图。
 */
async function renderAndDownload(el: HTMLElement, filename: string): Promise<void> {
  /*
   * 让出一轮事件循环，等切换主题后的样式生效。
   * 不能用 requestAnimationFrame：浏览器在标签页隐藏时会暂停它，
   * 用户导出途中切走标签，导出就会永久卡住、主题停在白色。
   */
  await new Promise(resolve => setTimeout(resolve, 32))

  // 不开 cacheBust：它会给每个引用资源加时间戳重新拉取，
  // 只要有一个请求挂起，整个导出就会永远停在 pending。
  const dataUrl = await toPng(el, { pixelRatio: 2 })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportPng(
  el: HTMLElement,
  filename: string,
  options: ExportOptions = {},
): Promise<void> {
  const root = document.documentElement
  const previous = root.dataset.theme ?? 'aurora'
  root.dataset.theme = 'paper'

  try {
    // 超时要罩住整个流程，而不只是截图那一步
    await withTimeout(
      renderAndDownload(el, filename),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )
  }
  finally {
    // 无论成败都要还原，否则用户会莫名其妙停在白色主题里
    root.dataset.theme = previous
  }
}
