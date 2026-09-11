import type { Ref } from 'vue'
import type { Scene, Step } from '~/core'
import { computed, ref, watch } from 'vue'
import { replay } from '~/core'

export interface PlayerOptions {
  /** 自动播放时每步停留的毫秒数 */
  interval?: number
  /**
   * 首次渲染就停在这一步，用于深链还原。
   * 必须在这里给出，而不是挂载后再补设——否则图会慢一拍，
   * 出现「讲解已是第 2 步、图还停在第 0 步」的错位。
   */
  initialStep?: number
}

function clamp(n: number, max: number) {
  return Math.max(0, Math.min(n, max))
}

export function usePlayer(scene: Ref<Scene>, options: PlayerOptions = {}) {
  const interval = options.interval ?? 2200
  const step = ref(clamp(options.initialStep ?? 0, scene.value.steps.length))
  const playing = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const total = computed(() => scene.value.steps.length)
  const graph = computed(() => replay(scene.value, step.value))
  const current = computed<Step | null>(() =>
    step.value === 0 ? null : scene.value.steps[step.value - 1] ?? null)

  function stop() {
    playing.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function goto(n: number) {
    step.value = clamp(n, total.value)
  }

  function next() {
    if (step.value >= total.value) {
      stop()
      return
    }
    step.value += 1
  }

  function prev() {
    goto(step.value - 1)
  }

  function togglePlay() {
    if (playing.value) {
      stop()
      return
    }
    // 已经播到末尾时，从头开始播
    if (step.value >= total.value)
      step.value = 0

    playing.value = true
    timer = setInterval(() => {
      if (step.value >= total.value)
        stop()
      else
        step.value += 1
    }, interval)
  }

  // 换场景时回到初始态，避免沿用上一个场景的进度
  watch(() => scene.value.id, () => {
    stop()
    step.value = 0
  })

  return { step, playing, total, graph, current, next, prev, goto, togglePlay, stop }
}
