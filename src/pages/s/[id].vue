<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProtoCanvas from '~/components/canvas/ProtoCanvas.vue'
import CodePanel from '~/components/panels/CodePanel.vue'
import StepPanel from '~/components/panels/StepPanel.vue'
import { useExplore } from '~/composables/useExplore'
import { usePlayer } from '~/composables/usePlayer'
import { buildShareUrl, parseShareQuery } from '~/composables/useShareLink'
import { useTheme } from '~/composables/useTheme'
import { getScene, scenes } from '~/scenes'

const route = useRoute()
const router = useRouter()
const { theme, setTheme } = useTheme()

const scene = computed(() => getScene(String(route.params.id)) ?? scenes[0])
const player = usePlayer(scene)
const explore = useExplore(player.graph)

const canvasRef = ref<InstanceType<typeof ProtoCanvas> | null>(null)
const copied = ref(false)

/** 只有当前步声明了 traverse 才让连线流动，静止时保持实线 */
const flowingEdges = computed(() => player.current.value?.traverse ?? [])

/** 点击节点内的引用型属性行 → 视口聚焦到被引用的节点 */
function onFocusRef(nodeId: string) {
  canvasRef.value?.focusNode(nodeId)
}

// 进入页面时按链接参数还原进度与主题
onMounted(() => {
  const { step, theme: fromLink } = parseShareQuery(route.query)
  if (fromLink)
    setTheme(fromLink)
  player.goto(step)
})

// 步进时把进度同步进地址栏，这样任何时刻复制地址都能还原当前画面
watch(player.step, (s) => {
  router.replace({ query: { ...route.query, step: String(s) } })
})

async function copyShare() {
  const url = buildShareUrl(window.location.origin, scene.value.id, player.step.value, theme.value)
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

onKeyStroke('ArrowRight', () => player.next())
onKeyStroke('ArrowLeft', () => player.prev())
onKeyStroke(' ', (e) => {
  e.preventDefault()
  player.togglePlay()
})
</script>

<template>
  <div class="stage">
    <ProtoCanvas
      ref="canvasRef"
      :graph="player.graph.value"
      :flowing-edges="flowingEdges"
      :dimmed-nodes="explore.dimmedNodes.value"
      :highlighted-nodes="explore.highlightedNodes.value"
      :highlighted-edges="explore.highlightedEdges.value"
      @node-hover="explore.setHover"
      @focus-ref="onFocusRef"
    />

    <CodePanel :code="scene.code" :highlight="player.current.value?.codeRange" />

    <StepPanel
      :step="player.step.value"
      :total="player.total.value"
      :current="player.current.value"
      :playing="player.playing.value"
      @next="player.next"
      @prev="player.prev"
      @toggle-play="player.togglePlay"
    />

    <div class="tools">
      <button @click="canvasRef?.resetLayout()">
        ⟲ 重置布局
      </button>
      <button data-share @click="copyShare">
        {{ copied ? '✓ 已复制' : '🔗 复制分享链接' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.tools {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
}

.tools button {
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}
</style>
