<template>
  <div id="messages" class="messages">
    <MessageBubble v-for="(msg, i) in messages" :key="i" :msg="msg" />
  </div>
</template>

<script setup>
import MessageBubble from './MessageBubble.vue'

defineProps({ messages: Array })
</script>
