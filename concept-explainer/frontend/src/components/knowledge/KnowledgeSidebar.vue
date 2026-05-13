<template>
  <aside class="kb-sidebar" :class="{ open }">
    <div class="kb-header">
      <h2>知识库</h2>
      <button class="kb-close" @click="$emit('close')">&times;</button>
    </div>
    <div class="kb-tabs">
      <button class="kb-tab" :class="{ active: activeTab === 'personal' }" @click="$emit('update:activeTab', 'personal')">个人知识库</button>
      <button class="kb-tab" :class="{ active: activeTab === 'network' }" @click="$emit('update:activeTab', 'network')">网络知识库</button>
    </div>

    <div v-show="activeTab === 'personal'" class="kb-tab-content active">
      <div class="kb-stats">
        共 <span>{{ stats.total }}</span> 条记录
        <template v-for="(count, cat) in stats.byCategory" :key="cat">
          · {{ cat }} <span>{{ count }}</span>
        </template>
      </div>
      <CategoryFilter :categories="categories" :current="currentFilter" @filter="$emit('filter', $event)" />
      <KnowledgeList :entries="filteredEntries" @select="$emit('selectEntry', $event)" @delete="$emit('deleteEntry', $event)" />
      <CategoryManager :categories="categories" @add="$emit('addCategory', $event)" @delete="$emit('deleteCategory', $event)" />
    </div>

    <div v-show="activeTab === 'network'" class="kb-tab-content active">
      <div class="kb-placeholder">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        <p>网络知识库功能即将上线</p>
        <span>敬请期待...</span>
      </div>
    </div>
  </aside>

  <div class="kb-overlay" :class="{ show: open }" @click="$emit('close')"></div>
</template>

<script setup>
import CategoryFilter from './CategoryFilter.vue'
import KnowledgeList from './KnowledgeList.vue'
import CategoryManager from './CategoryManager.vue'

defineProps({
  open: Boolean,
  activeTab: String,
  categories: Array,
  currentFilter: String,
  filteredEntries: Array,
  stats: Object,
})
defineEmits(['close', 'update:activeTab', 'filter', 'selectEntry', 'deleteEntry', 'addCategory', 'deleteCategory'])
</script>
