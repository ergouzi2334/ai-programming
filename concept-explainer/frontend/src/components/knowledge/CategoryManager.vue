<template>
  <div class="kb-cat-mgr">
    <p class="kb-cat-mgr-title">管理分类</p>
    <div class="kb-cat-mgr-list">
      <span v-for="cat in categories" :key="cat" class="kb-cat-tag">
        {{ cat }}
        <button class="kb-cat-tag-del" @click="$emit('delete', cat)">&times;</button>
      </span>
    </div>
    <div class="kb-cat-mgr-add">
      <input
        v-model="name"
        placeholder="新分类名称"
        maxlength="20"
        @keydown.enter.exact.prevent="addCat"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      >
      <button class="btn btn-small btn-primary" @click="addCat">添加</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ categories: Array })
const emit = defineEmits(['add', 'delete'])

const name = ref('')
const composing = ref(false)

async function addCat() {
  if (composing.value) return
  const val = name.value.trim()
  if (!val) return
  try {
    await emit('add', val)
    name.value = ''
  } catch { /* handled by parent */ }
}
</script>
