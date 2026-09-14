<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { theme, toggle } = useTheme()
</script>

<template>
  <div class="app">
    <RouterView />
    <button
      class="theme-toggle"
      data-theme-toggle
      :aria-label="theme === 'aurora' ? '切换到霓虹主题' : '切换到极光主题'"
      @click="toggle"
    >
      <span
        data-theme-icon
        :class="theme === 'aurora' ? 'i-ph-sun-bold' : 'i-ph-moon-stars-bold'"
      />
      {{ theme === 'aurora' ? '极光' : '霓虹' }}
    </button>
  </div>
</template>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.theme-toggle {
  position: fixed;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  top: 20px;
  right: 20px;
  z-index: 10;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}
</style>
