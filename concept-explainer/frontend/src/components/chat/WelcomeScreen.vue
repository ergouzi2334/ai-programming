<template>
  <div class="welcome">
    <div class="welcome-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12l3 3 5-5"/>
      </svg>
    </div>
    <p class="welcome-title">想了解什么概念？</p>
    <p class="welcome-hint">支持编程、AI 领域的任何概念，AI 会从四个维度为你详细解释</p>
    <div class="suggestion-groups">
      <div class="suggestion-group">
        <p class="group-label">编程概念</p>
        <div class="suggestion-chips">
          <button v-for="c in codingChips" :key="c" class="chip" @click="$emit('select', c)">{{ c }}</button>
        </div>
      </div>
      <div class="suggestion-group">
        <p class="group-label">AI 概念与工具</p>
        <div class="suggestion-chips">
          <button v-for="c in aiChips" :key="c" class="chip" @click="$emit('select', c)">{{ c }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['select'])

const codingChips = ['闭包 (Closure)', 'RESTful API', '异步编程 (Async)', '递归 (Recursion)', 'Docker 容器', 'MVC 架构']
const aiChips = ['大模型 (LLM)', 'RAG 检索增强生成', 'AI Agent', 'MCP 协议', 'Claude Code', '提示工程 (Prompt)']
</script>
