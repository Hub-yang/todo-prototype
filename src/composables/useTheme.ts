import { useStorage } from '@vueuse/core'
import { watchEffect } from 'vue'

export type ThemeName = 'aurora' | 'neon' | 'paper'

/** 可供用户切换的主题；paper 只用于导出，故不在此列 */
const SWITCHABLE: ThemeName[] = ['aurora', 'neon']

// 主题是全局唯一状态：同一页面内必须共享同一份 ref，否则切换只会影响局部
const theme = useStorage<ThemeName>('proto-theme', 'aurora')

watchEffect(() => {
  document.documentElement.dataset.theme = theme.value
})

export function useTheme() {
  function setTheme(next: ThemeName) {
    theme.value = next
  }

  function toggle() {
    const i = SWITCHABLE.indexOf(theme.value)
    // 当前若是 paper（导出中）也能安全回到 aurora
    theme.value = SWITCHABLE[(i + 1) % SWITCHABLE.length] ?? 'aurora'
  }

  return { theme, setTheme, toggle, switchable: SWITCHABLE }
}
