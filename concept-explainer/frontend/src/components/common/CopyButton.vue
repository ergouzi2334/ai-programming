<template>
  <button class="copy-btn" @click="copy">{{ label }}</button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ code: String })

const label = ref('复制代码')

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
    label.value = '已复制!'
    setTimeout(() => label.value = '复制代码', 2000)
  } catch {
    label.value = '复制失败'
    setTimeout(() => label.value = '复制代码', 2000)
  }
}
</script>
