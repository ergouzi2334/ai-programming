<template>
  <div v-if="visible" class="loading-toast">
    <div class="typing-dots"><span></span><span></span><span></span></div>
    <span>AI 思考中...</span>
  </div>
</template>

<script setup>
defineProps({ visible: Boolean })
</script>
