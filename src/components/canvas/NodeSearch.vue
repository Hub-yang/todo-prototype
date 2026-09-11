<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  nodes: Array<{ id: string, label: string }>
}>()

const emit = defineEmits<{ pick: [nodeId: string] }>()

const keyword = ref('')

const hits = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k)
    return []
  return props.nodes.filter(n => n.label.toLowerCase().includes(k)).slice(0, 8)
})

function pick(id: string) {
  emit('pick', id)
  // 清空以便连续搜索下一个节点
  keyword.value = ''
}
</script>

<template>
  <div class="search">
    <input v-model="keyword" type="search" placeholder="搜索节点，例如 Array">

    <ul v-if="keyword.trim()" class="hits">
      <li
        v-for="hit in hits"
        :key="hit.id"
        data-hit
        @click="pick(hit.id)"
      >
        {{ hit.label }}
      </li>
      <li v-if="hits.length === 0" class="empty">
        没有匹配的节点
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 浮层允许 backdrop-filter */
.search {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 5;
  width: 220px;
}

input {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  font-size: 12px;
}

.hits {
  margin: 6px 0 0;
  padding: 4px;
  border: 1px solid var(--node-border);
  border-radius: 10px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  list-style: none;
}

.hits li {
  padding: 5px 8px;
  border-radius: 6px;
  color: var(--text-primary);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  cursor: pointer;
}

.hits li:hover {
  background: var(--node-header);
}

.empty {
  color: var(--text-muted);
  cursor: default;
}
</style>
