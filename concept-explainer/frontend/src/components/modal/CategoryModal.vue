<template>
  <div v-if="visible" class="cat-modal-overlay">
    <div class="cat-modal">
      <p class="cat-modal-title">选择分类</p>
      <p class="cat-modal-concept">{{ concept }}</p>
      <div class="cat-modal-list">
        <div
          v-for="cat in categories" :key="cat"
          class="cat-option"
          :class="{ selected: cat === selected }"
          @click="select(cat)"
        >
          <span>{{ cat }}</span>
          <button class="cat-option-del" @click.stop="$emit('deleteCategory', cat)">&times;</button>
        </div>
      </div>
      <div class="cat-modal-new">
        <input
          v-model="newName"
          placeholder="输入新分类名称"
          maxlength="20"
          @keydown.enter.exact.prevent="addCat"
          @compositionstart="composing = true"
          @compositionend="composing = false"
        >
        <button class="btn btn-small btn-primary" @click="addCat">添加</button>
      </div>
      <div class="cat-modal-actions">
        <button class="btn btn-outline" @click="$emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ visible: Boolean, categories: Array, concept: String, selected: String })
const emit = defineEmits(['select', 'cancel', 'addCategory', 'deleteCategory'])

const newName = ref('')
const composing = ref(false)

function select(cat) {
  emit('select', cat)
}

async function addCat() {
  if (composing.value) return
  const val = newName.value.trim()
  if (!val) return
  emit('addCategory', val)
  newName.value = ''
}
</script>
