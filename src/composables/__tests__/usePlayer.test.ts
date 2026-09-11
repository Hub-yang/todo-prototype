import type { Scene } from '~/core'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePlayer } from '../usePlayer'

const scene: Scene = {
  id: 'demo',
  title: '演示',
  code: 'const a = {}',
  initial: { nodes: [{ id: 'a', label: 'a', kind: 'plain', props: [] }], edges: [] },
  steps: [
    { title: '一', narration: '加 b', patch: [{ op: 'addNode', node: { id: 'b', label: 'b', kind: 'plain', props: [] } }] },
    { title: '二', narration: '连线', patch: [{ op: 'addEdge', edge: { id: 'e1', source: 'a', target: 'b', kind: 'proto' } }] },
  ],
}

describe('usePlayer', () => {
  it('初始停在第 0 步', () => {
    const p = usePlayer(ref(scene))
    expect(p.step.value).toBe(0)
    expect(p.graph.value.nodes).toHaveLength(1)
    expect(p.current.value).toBeNull()
  })

  it('next 前进一步并同步图', () => {
    const p = usePlayer(ref(scene))
    p.next()
    expect(p.step.value).toBe(1)
    expect(p.graph.value.nodes).toHaveLength(2)
    expect(p.current.value?.title).toBe('一')
  })

  it('prev 后退一步，图也随之回退', () => {
    const p = usePlayer(ref(scene))
    p.next()
    p.next()
    p.prev()
    expect(p.step.value).toBe(1)
    expect(p.graph.value.edges).toHaveLength(0)
  })

  it('到头之后 next 不越界', () => {
    const p = usePlayer(ref(scene))
    p.goto(99)
    expect(p.step.value).toBe(2)
    p.next()
    expect(p.step.value).toBe(2)
  })

  it('到底之后 prev 不越界', () => {
    const p = usePlayer(ref(scene))
    p.prev()
    expect(p.step.value).toBe(0)
  })

  it('total 反映场景步数', () => {
    expect(usePlayer(ref(scene)).total.value).toBe(2)
  })

  it('播放会自动推进，到末尾自动停止', async () => {
    vi.useFakeTimers()
    const p = usePlayer(ref(scene), { interval: 100 })
    p.togglePlay()
    expect(p.playing.value).toBe(true)
    await vi.advanceTimersByTimeAsync(350)
    expect(p.step.value).toBe(2)
    expect(p.playing.value).toBe(false)
    vi.useRealTimers()
  })

  it('再次 togglePlay 会暂停', async () => {
    vi.useFakeTimers()
    const p = usePlayer(ref(scene), { interval: 100 })
    p.togglePlay()
    await vi.advanceTimersByTimeAsync(120)
    p.togglePlay()
    const stepped = p.step.value
    await vi.advanceTimersByTimeAsync(300)
    expect(p.playing.value).toBe(false)
    expect(p.step.value).toBe(stepped)
    vi.useRealTimers()
  })

  it('已播到末尾时再播放，会从头开始', async () => {
    vi.useFakeTimers()
    const p = usePlayer(ref(scene), { interval: 100 })
    p.goto(2)
    p.togglePlay()
    expect(p.step.value).toBe(0)
    p.stop()
    vi.useRealTimers()
  })

  it('切换场景时步数归零', async () => {
    const s = ref(scene)
    const p = usePlayer(s)
    p.next()
    s.value = { ...scene, id: 'other' }
    await nextTick()
    expect(p.step.value).toBe(0)
  })
})
