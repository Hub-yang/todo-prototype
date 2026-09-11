import type { ThemeName } from './useTheme'

/** 可通过链接切入的主题；paper 仅供导出，不在此列 */
const SHAREABLE_THEMES: ThemeName[] = ['aurora', 'neon']

export function buildShareUrl(
  origin: string,
  sceneId: string,
  step: number,
  theme: ThemeName,
): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}/#/s/${sceneId}?step=${step}&theme=${theme}`
}

export function parseShareQuery(
  query: Record<string, unknown>,
): { step: number, theme: ThemeName | null } {
  // vue-router 的同名参数可能是数组，这里只认第一个值
  const rawStep = Array.isArray(query.step) ? query.step[0] : query.step
  const parsed = Number(rawStep)
  const step = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0

  const rawTheme = String(Array.isArray(query.theme) ? query.theme[0] : query.theme ?? '')
  const theme = SHAREABLE_THEMES.includes(rawTheme as ThemeName)
    ? (rawTheme as ThemeName)
    : null

  return { step, theme }
}
