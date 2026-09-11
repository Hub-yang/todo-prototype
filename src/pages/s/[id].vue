<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProtoCanvas from '~/components/canvas/ProtoCanvas.vue'
import CodePanel from '~/components/panels/CodePanel.vue'
import StepPanel from '~/components/panels/StepPanel.vue'
import { usePlayer } from '~/composables/usePlayer'
import { getScene, scenes } from '~/scenes'

const route = useRoute()
const scene = computed(() => getScene(String(route.params.id)) ?? scenes[0])
const player = usePlayer(scene)

/** 只有当前步声明了 traverse 才让连线流动，静止时保持实线 */
const flowingEdges = computed(() => player.current.value?.traverse ?? [])

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
      :graph="player.graph.value"
      :flowing-edges="flowingEdges"
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
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
