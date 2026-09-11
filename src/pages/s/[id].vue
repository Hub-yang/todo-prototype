<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ProtoCanvas from '~/components/canvas/ProtoCanvas.vue'
import CodePanel from '~/components/panels/CodePanel.vue'
import StepPanel from '~/components/panels/StepPanel.vue'
import { useExplore } from '~/composables/useExplore'
import { usePlayer } from '~/composables/usePlayer'
import { getScene, scenes } from '~/scenes'

const route = useRoute()
const scene = computed(() => getScene(String(route.params.id)) ?? scenes[0])
const player = usePlayer(scene)
const explore = useExplore(player.graph)

const canvasRef = ref<InstanceType<typeof ProtoCanvas> | null>(null)

/** 只有当前步声明了 traverse 才让连线流动，静止时保持实线 */
const flowingEdges = computed(() => player.current.value?.traverse ?? [])

/** 点击节点内的引用型属性行 → 视口聚焦到被引用的节点 */
function onFocusRef(nodeId: string) {
  canvasRef.value?.focusNode(nodeId)
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

    <button class="reset" @click="canvasRef?.resetLayout()">
      ⟲ 重置布局
    </button>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.reset {
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}
</style>
