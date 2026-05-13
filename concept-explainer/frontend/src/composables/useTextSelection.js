import { ref } from 'vue'

export function useTextSelection() {
  const isComposing = ref(false)
  const multiWordMode = ref(false)
  const confirmedWords = ref([])
  const selectedText = ref('')
  const highlightSpans = []

  // IME 组合状态追踪
  document.addEventListener('compositionstart', () => { isComposing.value = true })
  document.addEventListener('compositionend', () => { isComposing.value = false })

  function getSelectionInZone(zoneEl) {
    const sel = window.getSelection()
    const text = (sel?.toString() || '').trim()
    if (!text || text.length > 50) return null

    const anchor = sel.anchorNode
    if (!anchor || !zoneEl.contains(anchor)) return null

    try {
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      return { text, rect, range }
    } catch {
      return null
    }
  }

  function highlightRange(range) {
    try {
      const span = document.createElement('mark')
      span.className = 'hl-word'
      range.surroundContents(span)
      highlightSpans.push(span)
    } catch { /* 跨节点情况忽略 */ }
  }

  function clearHighlights() {
    highlightSpans.forEach(span => {
      const parent = span.parentNode
      if (parent) {
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        parent.removeChild(span)
        parent.normalize()
      }
    })
    highlightSpans.length = 0
  }

  function enterMultiWordMode() {
    multiWordMode.value = true
    confirmedWords.value = []
  }

  function confirmWord(text, range) {
    if (!confirmedWords.value.includes(text)) {
      confirmedWords.value.push(text)
      if (range) highlightRange(range)
    }
  }

  function exitMultiWordMode() {
    multiWordMode.value = false
    const words = [...confirmedWords.value]
    clearHighlights()
    confirmedWords.value = []
    return words
  }

  function cancelMultiWordMode() {
    multiWordMode.value = false
    confirmedWords.value = []
    clearHighlights()
  }

  return {
    isComposing,
    multiWordMode,
    confirmedWords,
    selectedText,
    getSelectionInZone,
    enterMultiWordMode,
    confirmWord,
    exitMultiWordMode,
    cancelMultiWordMode,
  }
}
