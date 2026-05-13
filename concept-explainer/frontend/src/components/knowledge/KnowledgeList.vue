<template>
  <div class="kb-list">
    <p v-if="entries.length === 0" class="kb-empty">暂无记录，搜索问题后自动添加</p>
    <div
      v-for="e in entries" :key="e.id"
      class="kb-entry"
      @click="$emit('select', e.concept)"
    >
      <div class="kb-entry-info">
        <div class="kb-entry-concept">{{ e.concept }}</div>
        <div class="kb-entry-meta">
          <span class="kb-entry-cat" :class="{ 'cat-ai': e.category === 'AI编程' }">{{ e.category }}</span>
          <span class="kb-entry-time">{{ e.created_at }}</span>
        </div>
      </div>
      <button class="kb-entry-delete" @click.stop="$emit('delete', e.id)" title="删除">&times;</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ entries: Array })
defineEmits(['select', 'delete'])
</script>
