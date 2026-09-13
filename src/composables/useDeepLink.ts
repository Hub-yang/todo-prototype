import type { Ref } from 'vue'
import type { ThemeName } from './useTheme'
import { watch } from 'vue'
import { parseShareQuery } from './useShareLink'

export interface DeepLinkOptions {
  /** 地址栏里的场景 id */
  sceneId: Readonly<Ref<string>>
  /** 读当前地址栏的查询参数 */
  query: () => Record<string, unknown>
  /** 播放器的当前步 */
  step: Ref<number>
  goto: (n: number) => void
  setTheme: (theme: ThemeName) => void
  replaceQuery: (query: Record<string, string>) => void
}

/**
 * 地址栏参数一律按字符串处理：vue-router 的同名参数可能是数组，
 * 只带键不带值的参数是 null，这两种都不该被原样写回分享链接。
 */
function toStringQuery(query: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    const first = Array.isArray(value) ? value[0] : value
    if (typeof first === 'string')
      out[key] = first
  }
  return out
}

/**
 * 把地址栏与播放进度双向绑起来。
 *
 * 两个方向都放在这里，是因为它们会互相干扰：换场景时 usePlayer 会把步数归零，
 * 归零又会触发回写，把深链里的 step 冲掉。分散在页面里写两个 watch 很难看出这层关系。
 */
export function useDeepLink(options: DeepLinkOptions) {
  // 换场景时重新读一遍深链参数。
  // 这个 watch 必须注册在 usePlayer 之后：它先归零，我们再改回深链要求的步数。
  watch(options.sceneId, () => {
    const { step, theme } = parseShareQuery(options.query())
    if (theme)
      options.setTheme(theme)
    options.goto(step)
  })

  // 步进写回地址栏，这样任何时刻复制地址都能还原当前画面。
  // 同一批里步数被改动多次（先归零、再跳到深链那步）时，watch 只在末尾跑一次，
  // 写回的是最终值，不会把中间的 0 留在地址栏里。
  watch(options.step, (step) => {
    options.replaceQuery({ ...toStringQuery(options.query()), step: String(step) })
  })
}
