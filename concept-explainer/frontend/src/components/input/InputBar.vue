<template>
  <footer class="input-bar">
    <div class="container input-container">
      <div class="default-cat">
        <span class="default-cat-label">保存到</span>
        <select class="default-cat-select" :value="defaultCategory" @change="$emit('update:defaultCategory', $event.target.value)">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <textarea
        ref="textareaRef"
        v-model="text"
        placeholder="输入你想了解的概念，例如：什么是闭包？MCP 怎么用？"
        rows="1"
        maxlength="500"
        @keydown.enter.exact.prevent="onEnter"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @input="autoResize"
      ></textarea>
      <button class="btn btn-send" :disabled="!text.trim() || loading" @click="onSend" title="发送">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22,2 15,22 11,13 2,9"/>
        </svg>
      </button>
    </div>
  </footer>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  categories: Array,
  defaultCategory: String,
  loading: Boolean,
})
const emit = defineEmits(['update:defaultCategory', 'send'])

const text = ref('')
const isComposing = ref(false)
const textareaRef = ref(null)

function onEnter() {
  if (isComposing.value) return
  send()
}

function onSend() {
  send()
}

function send() {
  const val = text.value.trim()
  if (!val || props.loading) return
  emit('send', val, props.defaultCategory)
  text.value = ''
  nextTick(autoResize)
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function focus() {
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>
