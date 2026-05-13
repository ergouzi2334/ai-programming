import { reactive, ref } from 'vue'
import { api } from '../api/index.js'

export function useChat() {
  const messages = reactive([])
  const isLoading = ref(false)
  const error = ref('')
  const history = []

  function normalize(str) {
    return str.replace(/\s+/g, ' ').replace(/[？?。.！!，,]+$/g, '').trim()
  }

  async function send(concept, category = '') {
    concept = normalize(concept || '')
    if (!concept || isLoading.value) return

    isLoading.value = true
    error.value = ''

    messages.push({ role: 'user', content: concept })

    try {
      const resp = await api.chat(concept, category, history)
      const data = resp.data
      if (data.success) {
        messages.push({
          role: 'assistant',
          content: data.content,
          fromWeb: data.from_web,
          category: data.category,
        })
        history.push({ role: 'user', content: concept })
        history.push({ role: 'assistant', content: data.content })
      } else {
        messages.push({ role: 'error', content: data.error || '请求失败' })
      }
    } catch (e) {
      messages.push({ role: 'error', content: '网络错误：' + e.message })
    } finally {
      isLoading.value = false
    }
  }

  function clearHistory() {
    messages.length = 0
    history.length = 0
    error.value = ''
  }

  return { messages, isLoading, error, send, clearHistory }
}
