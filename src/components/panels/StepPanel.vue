<script setup lang="ts">
import type { Step } from '~/core'
import { ref } from 'vue'

defineProps<{
  step: number
  total: number
  current: Step | null
  playing: boolean
}>()

const emit = defineEmits<{
  next: []
  prev: []
  togglePlay: []
}>()

const collapsed = ref(false)
</script>

<template>
  <div class="panel" :data-collapsed="String(collapsed)">
    <button
      class="collapse"
      data-collapse
      :aria-label="collapsed ? '展开讲解' : '折叠讲解'"
      :title="collapsed ? '展开讲解' : '折叠讲解'"
      @click="collapsed = !collapsed"
    >
      <template v-if="collapsed">
        讲解
      </template>
      <span :class="collapsed ? 'i-ph-caret-up-bold' : 'i-ph-caret-down-bold'" />
    </button>

    <template v-if="!collapsed">
      <div class="meta">
        步骤 {{ step }} / {{ total }}
        <span v-if="current" class="title">· {{ current.title }}</span>
      </div>

      <p v-if="current" class="narration">
        {{ current.narration }}
      </p>
      <p v-else class="narration muted">
        点「播放」开始，或用
        <span class="i-ph-caret-left-bold key" />
        <span class="i-ph-caret-right-bold key" />
        逐步查看
      </p>

      <div class="ctl">
        <button
          data-prev
          :disabled="step === 0"
          aria-label="上一步"
          title="上一步"
          @click="emit('prev')"
        >
          <span class="i-ph-caret-left-bold" />
        </button>
        <button
          class="primary"
          data-play
          :aria-label="playing ? '暂停' : '播放'"
          @click="emit('togglePlay')"
        >
          <span :class="playing ? 'i-ph-pause-fill' : 'i-ph-play-fill'" />
          {{ playing ? '暂停' : '播放' }}
        </button>
        <button
          data-next
          :disabled="step === total"
          aria-label="下一步"
          title="下一步"
          @click="emit('next')"
        >
          <span class="i-ph-caret-right-bold" />
        </button>
        <div class="bar">
          <i :style="{ width: `${total ? (step / total) * 100 : 0}%` }" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 浮层是唯一允许使用 backdrop-filter 的地方 */
/*
 * 靠右下角摆放，而不是底部居中：原型链的图是纵向生长的，实例节点正落在
 * 画布中轴线的下方，居中浮层会把它盖住。
 */
.panel {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: min(440px, calc(100% - 40px));
  padding: 12px 16px;
  border: 1px solid var(--node-border);
  border-radius: 14px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
}

.panel[data-collapsed='true'] {
  width: auto;
  padding: 6px 12px;
}

.collapse {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  float: right;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.meta {
  color: var(--text-muted);
  font-size: 12px;
}

.title {
  color: var(--text-primary);
}

.narration {
  margin: 8px 0 10px;
  font-size: 14px;
  line-height: 1.7;
}

.muted {
  color: var(--text-muted);
}

.ctl {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctl button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px;
  border: 1px solid var(--node-border);
  border-radius: 8px;
  background: var(--node-surface);
  color: var(--text-primary);
  cursor: pointer;
}

.ctl button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctl .primary {
  border-color: var(--edge-prototype);
}

/* 正文里提到的方向键，压低一点基线才不会顶着行高 */
.key {
  vertical-align: -0.12em;
}

.bar {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--node-surface);
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--edge-prototype);
  transition: width 0.3s;
}
</style>
