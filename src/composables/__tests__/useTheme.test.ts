import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  // 注意：主题是模块级单例（同一页面内必须唯一），本用例依赖模块首次加载状态，
  // 因此必须保持在文件首位。
  it('默认主题是 aurora', () => {
    expect(useTheme().theme.value).toBe('aurora')
  })

  it('setTheme 会把主题写到 documentElement 上', async () => {
    const { setTheme } = useTheme()
    setTheme('neon')
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('neon')
  })

  it('toggle 在 aurora 与 neon 之间往返', () => {
    const { theme, toggle, setTheme } = useTheme()
    setTheme('aurora')
    toggle()
    expect(theme.value).toBe('neon')
    toggle()
    expect(theme.value).toBe('aurora')
  })

  it('toggle 永远不会切到 paper（它只用于导出）', () => {
    const { theme, toggle, setTheme } = useTheme()
    setTheme('aurora')
    for (let i = 0; i < 6; i++) {
      toggle()
      expect(theme.value).not.toBe('paper')
    }
  })

  it('可切换主题列表只含 aurora 与 neon', () => {
    expect(useTheme().switchable).toEqual(['aurora', 'neon'])
  })

  it('多次调用 useTheme 共享同一份状态', () => {
    const a = useTheme()
    const b = useTheme()
    a.setTheme('neon')
    expect(b.theme.value).toBe('neon')
  })

  it('主题会持久化到 localStorage', async () => {
    useTheme().setTheme('neon')
    await nextTick()
    expect(localStorage.getItem('proto-theme')).toContain('neon')
  })
})
