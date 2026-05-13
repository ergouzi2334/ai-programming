import { ref, reactive } from 'vue'
import { api } from '../api/index.js'

export function useWordPopup() {
  const visible = ref(false)
  const word = ref('')
  const explanation = ref('')
  const loading = ref(false)
  const followupMode = ref(false)
  const followupQuestion = ref('')
  const multiWords = ref([])

  const position = reactive({ left: 0, top: 0, transform: '' })
  const dragOffset = reactive({ x: 0, y: 0 })

  let isDragging = false
  let dragStart = { x: 0, y: 0 }

  function showForWord(text, rect) {
    word.value = text
    explanation.value = '查询中...'
    visible.value = true
    followupMode.value = false
    followupQuestion.value = ''
    positionPopup(rect)
    fetchExplanation(text)
  }

  function showForWords(words, rect) {
    multiWords.value = [...words]
    word.value = words.join('、')
    explanation.value = '查询中...'
    visible.value = true
    followupMode.value = false
    if (rect) positionPopup(rect)
    fetchMultiExplanation(words)
  }

  function positionPopup(rect) {
    const popupH = 300
    if (rect.top > popupH + 20) {
      position.top = rect.top - 12
      position.transform = 'translate(-50%, -100%)'
    } else {
      position.top = rect.bottom + 12
      position.transform = 'translate(-50%, 0)'
    }
    position.left = rect.left + rect.width / 2
  }

  async function fetchExplanation(text) {
    loading.value = true
    try {
      const resp = await api.quickExplain({ word: text })
      if (resp.data.success) {
        explanation.value = resp.data.explanation
      } else {
        hide()
      }
    } catch {
      hide()
    } finally {
      loading.value = false
    }
  }

  async function fetchMultiExplanation(words) {
    loading.value = true
    try {
      const resp = await api.quickExplain({ words })
      if (resp.data.success) {
        explanation.value = resp.data.explanation
      }
    } catch {
      explanation.value = '请求失败'
    } finally {
      loading.value = false
    }
  }

  async function sendFollowup() {
    const q = followupQuestion.value.trim()
    if (!q) return
    followupQuestion.value = ''
    explanation.value = '思考中...'
    try {
      const resp = await api.quickExplain({
        word: word.value,
        question: q,
        context: explanation.value !== '思考中...' ? explanation.value : '',
      })
      if (resp.data.success) {
        explanation.value = resp.data.explanation
      }
    } catch {
      explanation.value = '请求失败'
    }
  }

  function openFollowup() {
    followupMode.value = true
    followupQuestion.value = ''
  }

  function hide() {
    visible.value = false
    followupMode.value = false
    followupQuestion.value = ''
    explanation.value = ''
    multiWords.value = []
  }

  // 拖拽
  function onDragStart(e) {
    if (!visible.value) return
    isDragging = true
    const el = e.currentTarget.closest('.word-popup')
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragStart.x = e.clientX
    dragStart.y = e.clientY
    position.left = rect.left
    position.top = rect.top
    position.transform = 'none'
  }

  function onDragMove(e) {
    if (!isDragging) return
    position.left = position.left + e.clientX - dragStart.x
    position.top = position.top + e.clientY - dragStart.y
    dragStart.x = e.clientX
    dragStart.y = e.clientY
  }

  function onDragEnd() {
    isDragging = false
  }

  return {
    visible, word, explanation, loading, followupMode, followupQuestion,
    position, showForWord, showForWords, hide, openFollowup, sendFollowup,
    onDragStart, onDragMove, onDragEnd,
  }
}
