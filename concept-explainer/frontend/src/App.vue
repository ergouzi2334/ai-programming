<template>
  <div class="app">
    <!-- 头部 -->
    <header class="header">
      <div class="container header-inner">
        <div class="header-left">
          <h1 class="logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M9.5 12l1.5 1.5 3.5-4"/><line x1="12" y1="8" x2="12" y2="16"/>
            </svg>
            概念解释器
          </h1>
          <p class="subtitle">输入任何编程或 AI 概念，AI 为你生成结构化解释</p>
        </div>
        <button class="btn-kb-toggle" @click="openKb">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            <line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="10.5" x2="14" y2="10.5"/>
          </svg>
          <span>知识库</span>
        </button>
      </div>
    </header>

    <!-- 主布局 -->
    <div class="app-layout">
      <main class="main-content" :class="{ shifted: kbOpen }">
        <div class="container">
          <div class="chat-area" ref="chatZoneRef">
            <WelcomeScreen v-if="messages.length === 0" @select="onChipSelect" />
            <MessageList :messages="messages" />
          </div>
        </div>
      </main>

      <!-- 知识库侧边栏 -->
      <KnowledgeSidebar
        :open="kbOpen"
        :active-tab="kbActiveTab"
        :categories="categories"
        :current-filter="kbFilter"
        :filtered-entries="filteredEntries"
        :stats="kbStats"
        @close="kbOpen = false"
        @update:active-tab="kbActiveTab = $event"
        @filter="kbFilter = $event"
        @select-entry="onKbSelect"
        @delete-entry="onKbDelete"
        @add-category="onKbAddCat"
        @delete-category="onKbDeleteCat"
      />
    </div>

    <!-- 输入栏 -->
    <InputBar
      ref="inputBarRef"
      :categories="categories"
      :default-category="defaultCategory"
      :loading="isLoading"
      @update:default-category="setDefaultCat"
      @send="onSend"
    />

    <!-- 加载指示器 -->
    <LoadingToast :visible="isLoading" />

    <!-- 分类选择弹窗 -->
    <CategoryModal
      :visible="catModalVisible"
      :categories="categories"
      :concept="catModalConcept"
      :selected="defaultCategory"
      @select="onCatSelect"
      @cancel="catModalVisible = false"
      @add-category="onCatAdd"
      @delete-category="onCatDelete"
    />

    <!-- 划词弹窗 -->
    <WordPopup
      :visible="popupVisible"
      :word="popupWord"
      :explanation="popupExplanation"
      :followup-mode="popupFollowup"
      :position="popupPosition"
      @hide="hidePopup"
      @followup="onPopupFollowup"
      @dragstart="onPopupDragStart"
      @dragmove="onPopupDragMove"
      @dragend="onPopupDragEnd"
    />

    <!-- 多词模式指示器 -->
    <MultiWordIndicator
      :visible="multiWordMode"
      :count="confirmedWords.length"
      @cancel="cancelMultiWordMode"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useChat } from './composables/useChat.js'
import { useCategories } from './composables/useCategories.js'
import { useKnowledge } from './composables/useKnowledge.js'
import { useWordPopup } from './composables/useWordPopup.js'
import { useTextSelection } from './composables/useTextSelection.js'

import InputBar from './components/input/InputBar.vue'
import WelcomeScreen from './components/chat/WelcomeScreen.vue'
import MessageList from './components/chat/MessageList.vue'
import KnowledgeSidebar from './components/knowledge/KnowledgeSidebar.vue'
import CategoryModal from './components/modal/CategoryModal.vue'
import WordPopup from './components/popup/WordPopup.vue'
import LoadingToast from './components/common/LoadingToast.vue'
import MultiWordIndicator from './components/common/MultiWordIndicator.vue'

// ======== 聊天 ========
const { messages, isLoading, send } = useChat()
const inputBarRef = ref(null)

// ======== 分类 ========
const { categories, defaultCategory, load: loadCategories, setDefault: setDefaultCat, add: addCategory, remove: removeCategory } = useCategories()

// ======== 知识库 ========
const { filteredEntries, stats: kbStats, load: loadKb, setFilter: setKbFilter, remove: removeKbEntry } = useKnowledge()
const kbOpen = ref(false)
const kbActiveTab = ref('personal')
const kbFilter = ref('')

// ======== 分类弹窗 ========
const catModalVisible = ref(false)
const catModalConcept = ref('')

// ======== 划词弹窗 ========
const {
  visible: popupVisible, word: popupWord, explanation: popupExplanation,
  followupMode: popupFollowup, position: popupPosition,
  showForWord, showForWords, hide: hidePopup, openFollowup, sendFollowup,
  onDragStart: popupDragStart, onDragMove: popupDragMove, onDragEnd: popupDragEnd,
} = useWordPopup()

// ======== 选区检测 ========
const {
  isComposing, multiWordMode, confirmedWords,
  getSelectionInZone,
  enterMultiWordMode, confirmWord, exitMultiWordMode, cancelMultiWordMode,
} = useTextSelection()

const chatZoneRef = ref(null)

// ======== 生命周期 ========
onMounted(async () => {
  await loadCategories()
})

// ======== 输入发送 ========
function onSend(concept, category) {
  send(concept, category)
}

function onChipSelect(concept) {
  send(concept, defaultCategory.value)
}

// ======== 知识库操作 ========
async function openKb() {
  kbOpen.value = true
  await loadCategories()
  await loadKb()
}

function onKbSelect(concept) {
  send(concept, defaultCategory.value)
  kbOpen.value = false
}

async function onKbDelete(id) {
  await removeKbEntry(id)
}

async function onKbAddCat(name) {
  try { await addCategory(name) } catch (e) { alert(e.message) }
}

async function onKbDeleteCat(name) {
  if (!confirm(`确定删除分类"${name}"吗？该分类下的知识库记录不会被删除。`)) return
  try { await removeCategory(name) } catch (e) { alert(e.message) }
}

// ======== 分类弹窗 ========
function onCatSelect(cat) {
  setDefaultCat(cat)
  catModalVisible.value = false
}

async function onCatAdd(name) {
  try { await addCategory(name) } catch (e) { alert(e.message) }
}

async function onCatDelete(name) {
  if (!confirm(`确定删除分类"${name}"吗？`)) return
  try { await removeCategory(name) } catch (e) { alert(e.message) }
}

// ======== 划词弹窗操作 ========
function onPopupFollowup(question) {
  if (question) {
    sendFollowup(question)
  } else {
    openFollowup()
  }
}

function onPopupDragStart(e) { popupDragStart(e) }
function onPopupDragMove(e) { popupDragMove(e) }
function onPopupDragEnd() { popupDragEnd() }

// ======== Shift 多词模式 ========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && multiWordMode.value) {
    cancelMultiWordMode()
    return
  }
  if (e.key !== 'Shift') return
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  e.preventDefault()
  if (!multiWordMode.value) {
    enterMultiWordMode()
  } else {
    const words = exitMultiWordMode()
    if (words.length >= 1) {
      const firstSpan = document.querySelector('.hl-word')
      const rect = firstSpan ? firstSpan.getBoundingClientRect() : { top: 200, bottom: 220, left: 400, width: 100 }
      showForWords(words, rect)
    }
  }
})

// 空格确认选词
document.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || !multiWordMode.value) return
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  if (isComposing.value) return
  e.preventDefault()

  const sel = getSelectionInZone(chatZoneRef.value)
  if (!sel) return

  confirmWord(sel.text, sel.range)
  window.getSelection().removeAllRanges()
})

// ======== 划词检测 ========
document.addEventListener('mouseup', () => {
  if (multiWordMode.value || isComposing.value) return
  setTimeout(() => {
    if (isComposing.value) return
    const sel = getSelectionInZone(chatZoneRef.value)
    if (!sel) { return }
    showForWord(sel.text, sel.rect)
  }, 200)
})

// 点击弹窗外关闭
document.addEventListener('mousedown', (e) => {
  if (!popupVisible.value) return
  const popup = document.querySelector('.word-popup')
  if (popup && !popup.contains(e.target)) {
    hidePopup()
  }
})
</script>
