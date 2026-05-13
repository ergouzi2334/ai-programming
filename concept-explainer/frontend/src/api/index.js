import axios from 'axios'

const client = axios.create({
  timeout: 60000,
})

export const api = {
  chat(concept, category, history) {
    return client.post('/api/chat', { concept, category, history })
  },
  quickExplain({ word, words, question, context } = {}) {
    return client.post('/api/quick-explain', { word, words, question, context })
  },
  getCategories() {
    return client.get('/api/categories')
  },
  addCategory(name) {
    return client.post('/api/categories', { name })
  },
  deleteCategory(name) {
    return client.delete(`/api/categories/${encodeURIComponent(name)}`)
  },
  getKnowledge(category = '') {
    return client.get('/api/knowledge', { params: { category } })
  },
  deleteKnowledge(id) {
    return client.delete(`/api/knowledge/${id}`)
  },
}
