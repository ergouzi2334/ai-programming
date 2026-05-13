<template>
  <div v-if="visible" class="mw-indicator">
    <span class="mw-dot"></span>
    已选 <b>{{ count }}</b> 个词 · 按<kbd>空格</kbd>继续 · 按<kbd>Shift</kbd>结束
    <a href="#" @click.prevent="$emit('cancel')">取消</a>
  </div>
</template>

<script setup>
defineProps({ visible: Boolean, count: Number })
defineEmits(['cancel'])
</script>
