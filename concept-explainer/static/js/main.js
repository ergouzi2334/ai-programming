/**
 * 概念解释器 — 前端交互逻辑（含知识库）
 */
(function () {
    const messagesEl = document.getElementById('messages');
    const welcomeEl = document.getElementById('welcome');
    const inputEl = document.getElementById('conceptInput');
    const sendBtn = document.getElementById('sendBtn');
    const loadingToast = document.getElementById('loadingToast');
    const kbToggle = document.getElementById('kbToggle');
    const kbSidebar = document.getElementById('kbSidebar');
    const kbClose = document.getElementById('kbClose');
    const kbOverlay = document.getElementById('kbOverlay');
    const kbList = document.getElementById('kbList');
    const kbStats = document.getElementById('kbStats');
    const mainContent = document.getElementById('mainContent');

    let isLoading = false;
    let conversationHistory = [];
    let currentKbFilter = '';
    let allEntries = [];

    // ======== 建议标签点击 ========
    document.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            inputEl.value = chip.textContent;
            sendMessage();
        });
    });

    // ======== 发送按钮 ========
    sendBtn.addEventListener('click', sendMessage);

    // ======== 输入框事件 ========
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });

    // ======== 知识库开关 ========
    kbToggle.addEventListener('click', openKnowledgeBase);

    function openKnowledgeBase() {
        kbSidebar.classList.add('open');
        kbOverlay.classList.add('show');
        mainContent.classList.add('shifted');
        loadKnowledgeBase();
    }

    function closeKnowledgeBase() {
        kbSidebar.classList.remove('open');
        kbOverlay.classList.remove('show');
        mainContent.classList.remove('shifted');
    }

    kbClose.addEventListener('click', closeKnowledgeBase);
    kbOverlay.addEventListener('click', closeKnowledgeBase);

    // ======== 知识库标签切换 ========
    document.querySelectorAll('.kb-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.kb-tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.kb-tab-content').forEach((c) => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab === 'personal' ? 'tabPersonal' : 'tabNetwork').classList.add('active');
        });
    });

    // ======== 知识库分类筛选 ========
    document.querySelectorAll('.kb-filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.kb-filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentKbFilter = btn.dataset.cat;
            renderKnowledgeList();
        });
    });

    // ======== 加载知识库 ========
    async function loadKnowledgeBase() {
        try {
            const resp = await fetch('/api/knowledge');
            const data = await resp.json();
            if (data.success) {
                allEntries = data.entries;
                updateStats();
                renderKnowledgeList();
            }
        } catch (err) {
            console.error('加载知识库失败:', err);
        }
    }

    function updateStats() {
        const total = allEntries.length;
        const aiCount = allEntries.filter((e) => e.category === 'AI编程').length;
        const progCount = allEntries.filter((e) => e.category === '编程基础知识').length;
        kbStats.innerHTML = `共 <span>${total}</span> 条记录 · AI编程 <span>${aiCount}</span> · 编程基础 <span>${progCount}</span>`;
    }

    function renderKnowledgeList() {
        let entries = allEntries;
        if (currentKbFilter) {
            entries = entries.filter((e) => e.category === currentKbFilter);
        }

        if (entries.length === 0) {
            kbList.innerHTML = '<p class="kb-empty">暂无记录，搜索问题后自动添加</p>';
            return;
        }

        kbList.innerHTML = entries
            .map(
                (e) => `
            <div class="kb-entry" data-id="${e.id}" data-concept="${escapeHtml(e.concept)}">
                <div class="kb-entry-info">
                    <div class="kb-entry-concept">${escapeHtml(e.concept)}</div>
                    <div class="kb-entry-meta">
                        <span class="kb-entry-cat ${e.category === 'AI编程' ? 'cat-ai' : ''}">${e.category}</span>
                        <span class="kb-entry-time">${e.created_at}</span>
                    </div>
                </div>
                <button class="kb-entry-delete" data-id="${e.id}" title="删除">&times;</button>
            </div>`
            )
            .join('');

        // 点击条目重新查询
        kbList.querySelectorAll('.kb-entry').forEach((entry) => {
            entry.addEventListener('click', (e) => {
                if (e.target.classList.contains('kb-entry-delete')) return;
                const concept = entry.dataset.concept;
                inputEl.value = concept;
                closeKnowledgeBase();
                sendMessage();
            });
        });

        // 删除条目
        kbList.querySelectorAll('.kb-entry-delete').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                try {
                    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
                    allEntries = allEntries.filter((e) => e.id !== id);
                    updateStats();
                    renderKnowledgeList();
                } catch (err) {
                    console.error('删除失败:', err);
                }
            });
        });
    }

    // ======== 输入规范化 ========
    function normalizeInput(str) {
        return str
            .replace(/\s+/g, ' ')          // 合并连续空格、换行等
            .replace(/[？?。.！!，,]+$/g, '') // 去掉尾部标点
            .trim();
    }

    // ======== 发送消息 ========
    async function sendMessage() {
        if (isLoading) return;
        const concept = normalizeInput(inputEl.value);
        if (!concept) return;

        isLoading = true;
        sendBtn.disabled = true;
        loadingToast.style.display = 'flex';
        welcomeEl.style.display = 'none';

        appendUserMessage(concept);
        inputEl.value = '';
        inputEl.style.height = 'auto';

        try {
            const resp = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concept, history: conversationHistory }),
            });
            const data = await resp.json();

            if (data.success) {
                appendAIMessage(data.content, data.from_web);
                conversationHistory.push({ role: 'user', content: concept });
                conversationHistory.push({ role: 'assistant', content: data.content });
            } else {
                appendErrorMessage(data.error || '请求失败，请重试');
            }
        } catch (err) {
            appendErrorMessage('网络错误：' + err.message);
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            loadingToast.style.display = 'none';
            inputEl.focus();
        }
    }

    // ======== 渲染用户消息 ========
    function appendUserMessage(content) {
        const div = document.createElement('div');
        div.className = 'message message-user';
        div.innerHTML = `<div class="bubble user-bubble">${escapeHtml(content)}</div>`;
        messagesEl.appendChild(div);
        scrollToBottom();
    }

    // ======== 渲染 AI 消息 ========
    function appendAIMessage(content, fromWeb) {
        const div = document.createElement('div');
        div.className = 'message message-ai';
        let badgeHtml = '';
        if (fromWeb) {
            badgeHtml = '<div class="web-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>联网搜索</div>';
        }
        div.innerHTML = `<div class="bubble ai-bubble">${badgeHtml}${marked.parse(content)}</div>`;
        messagesEl.appendChild(div);
        addCopyButtons(div);
        scrollToBottom();
    }

    // ======== 渲染错误消息 ========
    function appendErrorMessage(msg) {
        const div = document.createElement('div');
        div.className = 'message message-ai';
        div.innerHTML = `<div class="bubble ai-bubble error-bubble">${escapeHtml(msg)}</div>`;
        messagesEl.appendChild(div);
        scrollToBottom();
    }

    // ======== 代码复制按钮 ========
    function addCopyButtons(container) {
        container.querySelectorAll('pre').forEach((pre) => {
            if (pre.querySelector('.copy-btn')) return;
            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.textContent = '复制代码';
            btn.addEventListener('click', () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '已复制!';
                    setTimeout(() => (btn.textContent = '复制代码'), 2000);
                }).catch(() => {
                    btn.textContent = '复制失败';
                    setTimeout(() => (btn.textContent = '复制代码'), 2000);
                });
            });
            pre.appendChild(btn);
        });
    }

    // ======== 滚动到底部 ========
    function scrollToBottom() {
        requestAnimationFrame(() => {
            messagesEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    // ======== HTML 转义 ========
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
