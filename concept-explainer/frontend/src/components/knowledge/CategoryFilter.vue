<template>
  <div class="kb-filter">
    <button class="kb-filter-btn" :class="{ active: current === '' }" @click="$emit('filter', '')">全部</button>
    <button
      v-for="cat in categories" :key="cat"
      class="kb-filter-btn"
      :class="{ active: current === cat }"
      @click="$emit('filter', cat)"
    >{{ cat }}</button>
  </div>
</template>

<script setup>
defineProps({ categories: Array, current: String })
defineEmits(['filter'])
</script>
