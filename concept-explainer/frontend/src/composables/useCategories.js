import { ref, readonly } from 'vue'
import { api } from '../api/index.js'

export function useCategories() {
  const categories = ref([])
  const defaultCategory = ref(localStorage.getItem('defaultCategory') || '')

  async function load() {
    try {
      const resp = await api.getCategories()
      if (resp.data.success) {
        categories.value = resp.data.categories
        if (!categories.value.includes(defaultCategory.value)) {
          defaultCategory.value = categories.value[0] || 'AI编程'
          localStorage.setItem('defaultCategory', defaultCategory.value)
        }
      }
    } catch (e) {
      console.error('加载分类失败:', e)
    }
  }

  function setDefault(cat) {
    defaultCategory.value = cat
    localStorage.setItem('defaultCategory', cat)
  }

  async function add(name) {
    const resp = await api.addCategory(name)
    if (resp.data.success) {
      categories.value = resp.data.categories
      return true
    }
    throw new Error(resp.data.error || '添加失败')
  }

  async function remove(name) {
    const resp = await api.deleteCategory(name)
    if (resp.data.success) {
      categories.value = resp.data.categories
      if (!categories.value.includes(defaultCategory.value)) {
        setDefault(categories.value[0])
      }
      return true
    }
    throw new Error(resp.data.error || '删除失败')
  }

  return { categories: readonly(categories), defaultCategory, load, setDefault, add, remove }
}
