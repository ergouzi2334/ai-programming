<template>
  <div
    v-if="visible"
    class="word-popup"
    :style="{ left: pos.left + 'px', top: pos.top + 'px', transform: pos.transform || 'none' }"
  >
    <div class="wp-header" @mousedown="onDragStart">
      <span class="wp-word">{{ word }}</span>
      <button class="wp-close" @click.stop="hide">&times;</button>
    </div>
    <div class="wp-body">{{ explanation }}</div>
    <div class="wp-actions">
      <button v-if="!followupMode" class="wp-followup-btn" @click="openFollowup">追问</button>
    </div>
    <div v-if="followupMode" class="wp-input-row">
      <input
        v-model="question"
        class="wp-input"
        placeholder="针对这个词追问..."
        maxlength="200"
        @keydown.enter.exact.prevent="doFollowup"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      >
      <button class="wp-send-btn" @click="doFollowup">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  word: String,
  explanation: String,
  followupMode: Boolean,
  position: Object,
})
const emit = defineEmits(['hide', 'followup', 'dragstart', 'dragmove', 'dragend'])

const question = ref('')
const composing = ref(false)
const pos = ref({ left: 400, top: 200, transform: '' })

watch(() => props.position, (p) => {
  if (p) Object.assign(pos.value, p)
}, { deep: true })

function hide() { emit('hide') }
function openFollowup() { emit('followup') }

function doFollowup() {
  if (composing.value) return
  if (!question.value.trim()) return
  emit('followup', question.value)
  question.value = ''
}

function onDragStart(e) {
  emit('dragstart', e)
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', onDragEnd)
}

function onDrag(e) {
  emit('dragmove', e)
}

function onDragEnd() {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', onDragEnd)
  emit('dragend')
}
</script>
