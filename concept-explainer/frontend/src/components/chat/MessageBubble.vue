<template>
  <div class="message" :class="'message-' + msg.role">
    <div v-if="msg.role === 'user'" class="bubble user-bubble">{{ msg.content }}</div>

    <div v-else-if="msg.role === 'assistant'" class="bubble ai-bubble">
      <div v-if="msg.fromWeb" class="web-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        联网搜索
      </div>
      <div class="md-content" v-html="rendered"></div>
    </div>

    <div v-else class="bubble ai-bubble error-bubble">{{ msg.content }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { marked } from 'marked'

const props = defineProps({ msg: Object })

const rendered = computed(() => {
  if (props.msg.role === 'assistant') {
    return marked.parse(props.msg.content || '')
  }
  return ''
})

// 代码块复制按钮
function addCopyButtons() {
  const container = document.getElementById('messages')
  if (!container) return
  const pres = container.querySelectorAll('.ai-bubble pre:not(.copy-ready)')
  pres.forEach(pre => {
    pre.classList.add('copy-ready')
    const btn = document.createElement('button')
    btn.className = 'copy-btn'
    btn.textContent = '复制代码'
    btn.onclick = async () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent
      try {
        await navigator.clipboard.writeText(code)
        btn.textContent = '已复制!'
        setTimeout(() => btn.textContent = '复制代码', 2000)
      } catch {
        btn.textContent = '复制失败'
        setTimeout(() => btn.textContent = '复制代码', 2000)
      }
    }
    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}

onMounted(addCopyButtons)
</script>
