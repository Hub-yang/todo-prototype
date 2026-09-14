<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NodeSearch from '~/components/canvas/NodeSearch.vue'
import ProtoCanvas from '~/components/canvas/ProtoCanvas.vue'
import ExportButton from '~/components/ExportButton.vue'
import CodePanel from '~/components/panels/CodePanel.vue'
import StepPanel from '~/components/panels/StepPanel.vue'
import { useDeepLink } from '~/composables/useDeepLink'
import { useExplore } from '~/composables/useExplore'
import { usePlayer } from '~/composables/usePlayer'
import { buildShareUrl, parseShareQuery } from '~/composables/useShareLink'
import { useTheme } from '~/composables/useTheme'
import { getScene, scenes } from '~/scenes'

const route = useRoute()
const router = useRouter()
const { theme, setTheme } = useTheme()

const scene = computed(() => getScene(String(route.params.id)) ?? scenes[0])

// 深链参数必须在首次渲染前读出：放到 onMounted 里补设会让图慢一拍，
// 出现「讲解已是第 2 步、图还停在第 0 步」的错位。
const fromLink = parseShareQuery(route.query)
if (fromLink.theme)
  setTheme(fromLink.theme)

const player = usePlayer(scene, { initialStep: fromLink.step })
const explore = useExplore(player.graph)

// 地址栏与进度的双向同步。必须注册在 usePlayer 之后：
// 换场景时 usePlayer 先把步数归零，这里再按新场景的深链参数改回去。
useDeepLink({
  sceneId: computed(() => String(route.params.id)),
  query: () => route.query,
  step: player.step,
  goto: player.goto,
  setTheme,
  replaceQuery: query => router.replace({ query }),
})

const canvasRef = ref<InstanceType<typeof ProtoCanvas> | null>(null)
/** 导出只截画布区域，浮层与按钮是操作界面，不该出现在配图里 */
const canvasAreaRef = ref<HTMLElement | null>(null)
const copied = ref(false)

/** 节点多到需要检索时才出现搜索框，小场景不必被它占位 */
const isLargeScene = computed(() => player.graph.value.nodes.length >= 12)
const searchableNodes = computed(() =>
  player.graph.value.nodes.map(n => ({ id: n.id, label: n.label })))

/** 只有当前步声明了 traverse 才让连线流动，静止时保持实线 */
const flowingEdges = computed(() => player.current.value?.traverse ?? [])

/** 点击节点内的引用型属性行 → 视口聚焦到被引用的节点 */
function onFocusRef(nodeId: string) {
  canvasRef.value?.focusNode(nodeId)
}

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
    <div ref="canvasAreaRef" class="canvas-area">
      <ProtoCanvas
        ref="canvasRef"
        :graph="player.graph.value"
        :flowing-edges="flowingEdges"
        :dimmed-nodes="explore.dimmedNodes.value"
        :highlighted-nodes="explore.highlightedNodes.value"
        :highlighted-edges="explore.highlightedEdges.value"
        :enable-visibility-culling="isLargeScene"
        @node-hover="explore.setHover"
        @focus-ref="onFocusRef"
      />

      <NodeSearch
        v-if="isLargeScene"
        :nodes="searchableNodes"
        @pick="onFocusRef"
      />
    </div>

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
        <span class="i-ph-arrow-counter-clockwise-bold" />
        重置布局
      </button>
      <button data-share @click="copyShare">
        <span :class="copied ? 'i-ph-check-bold' : 'i-ph-link-simple-bold'" />
        {{ copied ? '已复制' : '复制分享链接' }}
      </button>
      <ExportButton
        :target="canvasAreaRef"
        :filename="`${scene.id}-step${player.step.value}.png`"
      />
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas-area {
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}
</style>
