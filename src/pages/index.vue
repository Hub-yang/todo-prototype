<script setup lang="ts">
import { sceneGroups } from '~/scenes'
</script>

<template>
  <div class="home">
    <header>
      <h1>JavaScript 原型链可视化</h1>
      <p class="sub">
        每个场景都是一段可以逐步播放的图：左边是代码，右边是那一刻真实的对象关系。
      </p>
    </header>

    <section v-for="group in sceneGroups" :key="group.id" class="group">
      <h2>
        <span class="badge">{{ group.id }}</span>
        {{ group.title }}
        <small>{{ group.subtitle }}</small>
      </h2>
      <ul>
        <li v-for="s in group.scenes" :key="s.id">
          <RouterLink :to="`/s/${s.id}`">
            <span class="sid">{{ s.id }}</span>
            {{ s.title }}
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home {
  max-width: 760px;
  height: 100%;
  padding: 56px 24px 80px;
  margin: 0 auto;
  overflow-y: auto;
  color: var(--text-primary);
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.sub {
  margin: 0 0 40px;
  color: var(--text-muted);
  line-height: 1.7;
}

.group {
  margin-bottom: 34px;
}

h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  font-size: 16px;
}

h2 small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

.badge {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--node-border);
  border-radius: 7px;
  background: var(--node-header);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

li {
  margin: 4px 0;
}

a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-primary);
  text-decoration: none;
}

a:hover {
  border-color: var(--node-border);
  background: var(--node-surface);
}

.sid {
  color: var(--edge-prototype);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
}
</style>
