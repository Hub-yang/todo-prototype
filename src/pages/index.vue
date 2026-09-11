<script setup lang="ts">
import { scenes } from '~/scenes'
</script>

<template>
  <div class="home">
    <h1>JavaScript 原型链可视化</h1>
    <p class="sub">
      选一个场景开始
    </p>
    <ul>
      <li v-for="s in scenes" :key="s.id">
        <RouterLink :to="`/s/${s.id}`">
          {{ s.title }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.home {
  padding: 60px;
  color: var(--text-primary);
}

h1 {
  margin-bottom: 8px;
  font-size: 28px;
}

.sub {
  margin-bottom: 24px;
  color: var(--text-muted);
}

li {
  margin: 10px 0;
}

a {
  color: var(--edge-prototype);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
