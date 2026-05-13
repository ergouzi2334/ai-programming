import { ref, computed } from 'vue'
import { api } from '../api/index.js'

export function useKnowledge() {
  const entries = ref([])
  const currentFilter = ref('')
  const activeTab = ref('personal')

  const filteredEntries = computed(() => {
    if (!currentFilter.value) return entries.value
    return entries.value.filter(e => e.category === currentFilter.value)
  })

  const stats = computed(() => {
    const cats = {}
    entries.value.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + 1
    })
    return { total: entries.value.length, byCategory: cats }
  })

  async function load() {
    try {
      const resp = await api.getKnowledge()
      if (resp.data.success) {
        entries.value = resp.data.entries
      }
    } catch (e) {
      console.error('加载知识库失败:', e)
    }
  }

  function setFilter(cat) {
    currentFilter.value = cat
  }

  async function remove(id) {
    await api.deleteKnowledge(id)
    entries.value = entries.value.filter(e => e.id !== id)
  }

  return { entries, filteredEntries, currentFilter, stats, activeTab, load, setFilter, remove }
}
