import type { ThemeName } from '../useTheme'
import type { Scene } from '~/core'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { getScene } from '~/scenes'
import { useDeepLink } from '../useDeepLink'
import { usePlayer } from '../usePlayer'

/**
 * 把「路由 + 播放器」按页面里的真实顺序接起来：
 * usePlayer 先注册它的换场景归零，useDeepLink 后注册，两者的 watch 顺序必须和页面一致，
 * 否则测不出真正的竞态。
 */
function setup(initial: { id: string, query: Record<string, unknown> }) {
  const scene = ref<Scene>(getScene(initial.id)!)
  const sceneId = ref(initial.id)
  const query = ref<Record<string, unknown>>(initial.query)
  const themes: ThemeName[] = []

  const player = usePlayer(scene, { initialStep: Number(initial.query.step ?? 0) })
  const replaceQuery = vi.fn((q: Record<string, unknown>) => {
    query.value = q
  })

  useDeepLink({
    sceneId,
    query: () => query.value,
    step: player.step,
    goto: player.goto,
    setTheme: (t: ThemeName) => themes.push(t),
    replaceQuery,
  })

  /** 模拟地址栏被整体换成另一个场景的深链 */
  async function navigate(id: string, q: Record<string, unknown>) {
    scene.value = getScene(id)!
    sceneId.value = id
    query.value = q
    await nextTick()
  }

  return { player, query, themes, replaceQuery, navigate }
}

describe('useDeepLink', () => {
  it('在同一个路由里换场景，深链里的步数不会被归零', async () => {
    const s = setup({ id: 'a1', query: { step: '1' } })
    await s.navigate('a2', { step: '4' })
    expect(s.player.step.value).toBe(4)
  })

  it('新场景没带 step 时，回到第 0 步', async () => {
    const s = setup({ id: 'a1', query: { step: '3' } })
    await s.navigate('a2', {})
    expect(s.player.step.value).toBe(0)
  })

  it('step 超出新场景的步数时收敛到最后一步', async () => {
    const s = setup({ id: 'a1', query: { step: '1' } })
    await s.navigate('a2', { step: '999' })
    expect(s.player.step.value).toBe(getScene('a2')!.steps.length)
  })

  it('非法的 step 回落到 0', async () => {
    const s = setup({ id: 'a1', query: { step: '1' } })
    await s.navigate('a2', { step: '天书' })
    expect(s.player.step.value).toBe(0)
  })

  it('深链里的主题跟着一起切换', async () => {
    const s = setup({ id: 'a1', query: {} })
    await s.navigate('a2', { step: '1', theme: 'neon' })
    expect(s.themes).toContain('neon')
  })

  it('步进会把进度写回地址栏', async () => {
    const s = setup({ id: 'a1', query: { step: '0' } })
    s.player.next()
    await nextTick()
    expect(s.query.value.step).toBe('1')
  })

  it('换场景时地址栏最终停在深链要求的那一步，不被中途的归零覆盖', async () => {
    const s = setup({ id: 'a1', query: { step: '1' } })
    await s.navigate('a2', { step: '4' })
    await nextTick()
    expect(s.query.value.step).toBe('4')
  })

  it('写回地址栏时参数一律归一成字符串，数组取第一个、空值丢弃', async () => {
    const s = setup({ id: 'a1', query: { step: '0', theme: ['neon', 'aurora'], junk: null } })
    s.player.next()
    await nextTick()
    expect(s.query.value).toEqual({ step: '1', theme: 'neon' })
  })

  it('回写地址栏不会反过来再触发一次跳转，不打环', async () => {
    const s = setup({ id: 'a1', query: { step: '0' } })
    s.player.next()
    await nextTick()
    await nextTick()
    expect(s.player.step.value).toBe(1)
    expect(s.replaceQuery).toHaveBeenCalledTimes(1)
  })
})
