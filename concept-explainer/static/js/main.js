/**
 * 概念解释器 — 前端交互逻辑（含知识库 + 自定义分类）
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
    const kbFilter = document.getElementById('kbFilter');
    const mainContent = document.getElementById('mainContent');

    // 分类弹窗
    const catOverlay = document.getElementById('catModalOverlay');
    const catList = document.getElementById('catModalList');
    const catConcept = document.getElementById('catModalConcept');
    const catNewInput = document.getElementById('catNewInput');
    const catNewAddBtn = document.getElementById('catNewAddBtn');
    const catCancelBtn = document.getElementById('catCancelBtn');

    // 知识库内分类管理
    const kbCatMgrList = document.getElementById('kbCatMgrList');
    const kbCatInput = document.getElementById('kbCatInput');
    const kbCatAddBtn = document.getElementById('kbCatAddBtn');

    // 默认分类选择器
    const defaultCatSelect = document.getElementById('defaultCatSelect');

    let isLoading = false;
    let conversationHistory = [];
    let currentKbFilter = '';
    let allEntries = [];
    let allCategories = [];
    let defaultCategory = localStorage.getItem('defaultCategory') || '';

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
        loadCategoriesAndRender();
        loadKnowledgeBase();
    }

    async function loadCategoriesAndRender() {
        await loadCategories();
        // 确保默认分类有效
        if (!allCategories.includes(defaultCategory)) {
            defaultCategory = allCategories[0] || 'AI编程';
            localStorage.setItem('defaultCategory', defaultCategory);
        }
        renderDefaultCatSelect();
        renderKbFilter();
        renderKbCatMgr();
    }

    function renderDefaultCatSelect() {
        defaultCatSelect.innerHTML = allCategories
            .map((cat) => `<option value="${escapeHtml(cat)}" ${cat === defaultCategory ? 'selected' : ''}>${escapeHtml(cat)}</option>`)
            .join('');
    }

    defaultCatSelect.addEventListener('change', () => {
        defaultCategory = defaultCatSelect.value;
        localStorage.setItem('defaultCategory', defaultCategory);
    });

    // 页面加载时初始化
    loadCategoriesAndRender();

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

    // ======== 分类弹窗 ========
    async function showCategoryModal(concept) {
        pendingConcept = concept;
        catConcept.textContent = concept;
        await loadCategories();
        renderCategoryOptions();
        catOverlay.style.display = 'flex';
        catNewInput.value = '';
        catNewInput.focus();
    }

    function hideCategoryModal() {
        catOverlay.style.display = 'none';
        pendingConcept = '';
    }

    catCancelBtn.addEventListener('click', () => {
        hideCategoryModal();
        // 取消时恢复输入框内容
        inputEl.value = pendingConcept;
        inputEl.focus();
    });

    catNewAddBtn.addEventListener('click', async () => {
        const name = catNewInput.value.trim();
        if (!name) return;
        try {
            const resp = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const data = await resp.json();
            if (data.success) {
                allCategories = data.categories;
                renderDefaultCatSelect();
                renderCategoryOptions();
                catNewInput.value = '';
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error('添加分类失败:', err);
        }
    });

    catNewInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') catNewAddBtn.click();
    });

    async function loadCategories() {
        try {
            const resp = await fetch('/api/categories');
            const data = await resp.json();
            if (data.success) {
                allCategories = data.categories;
                renderDefaultCatSelect();
            }
        } catch (err) {
            console.error('加载分类失败:', err);
        }
    }

    function renderCategoryOptions() {
        catList.innerHTML = allCategories
            .map(
                (cat) => `
            <div class="cat-option" data-cat="${escapeHtml(cat)}">
                <span>${escapeHtml(cat)}</span>
                <button class="cat-option-del" data-cat="${escapeHtml(cat)}">&times;</button>
            </div>`
            )
            .join('');

        // 选择分类 → 发送请求
        catList.querySelectorAll('.cat-option').forEach((opt) => {
            opt.addEventListener('click', (e) => {
                if (e.target.classList.contains('cat-option-del')) return;
                const category = opt.dataset.cat;
                hideCategoryModal();
                doSend(pendingConcept, category);
            });
        });

        // 删除分类
        catList.querySelectorAll('.cat-option-del').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cat = btn.dataset.cat;
                if (!confirm(`确定删除分类"${cat}"吗？`)) return;
                try {
                    const resp = await fetch(`/api/categories/${encodeURIComponent(cat)}`, { method: 'DELETE' });
                    const data = await resp.json();
                    if (data.success) {
                        allCategories = data.categories;
                renderDefaultCatSelect();
                        renderCategoryOptions();
                    } else {
                        alert(data.error);
                    }
                } catch (err) {
                    console.error('删除分类失败:', err);
                }
            });
        });
    }

    // ======== KB 分类管理 ========
    kbCatAddBtn.addEventListener('click', async () => {
        const name = kbCatInput.value.trim();
        if (!name) return;
        try {
            const resp = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const data = await resp.json();
            if (data.success) {
                allCategories = data.categories;
                renderDefaultCatSelect();
                renderKbCatMgr();
                renderKbFilter();
                kbCatInput.value = '';
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error('添加分类失败:', err);
        }
    });

    kbCatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') kbCatAddBtn.click();
    });

    function renderKbCatMgr() {
        kbCatMgrList.innerHTML = allCategories
            .map(
                (cat) => `
            <span class="kb-cat-tag">
                ${escapeHtml(cat)}
                <button class="kb-cat-tag-del" data-cat="${escapeHtml(cat)}">&times;</button>
            </span>`
            )
            .join('');

        kbCatMgrList.querySelectorAll('.kb-cat-tag-del').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const cat = btn.dataset.cat;
                if (!confirm(`确定删除分类"${cat}"吗？该分类下的知识库记录不会被删除。`)) return;
                try {
                    const resp = await fetch(`/api/categories/${encodeURIComponent(cat)}`, { method: 'DELETE' });
                    const data = await resp.json();
                    if (data.success) {
                        allCategories = data.categories;
                renderDefaultCatSelect();
                        renderKbCatMgr();
                        renderKbFilter();
                        updateStats();
                    } else {
                        alert(data.error);
                    }
                } catch (err) {
                    console.error('删除分类失败:', err);
                }
            });
        });
    }

    // ======== KB 筛选按钮动态生成 ========
    function renderKbFilter() {
        let html = '<button class="kb-filter-btn active" data-cat="">全部</button>';
        allCategories.forEach((cat) => {
            html += `<button class="kb-filter-btn" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
        });
        kbFilter.innerHTML = html;

        kbFilter.querySelectorAll('.kb-filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                kbFilter.querySelectorAll('.kb-filter-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                currentKbFilter = btn.dataset.cat;
                renderKnowledgeList();
            });
        });
    }

    function updateStats() {
        const total = allEntries.length;
        let statsHtml = `共 <span>${total}</span> 条记录`;
        allCategories.forEach((cat) => {
            const count = allEntries.filter((e) => e.category === cat).length;
            statsHtml += ` · ${cat} <span>${count}</span>`;
        });
        kbStats.innerHTML = statsHtml;
    }

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
                        <span class="kb-entry-cat ${e.category === 'AI编程' ? 'cat-ai' : ''}">${escapeHtml(e.category)}</span>
                        <span class="kb-entry-time">${e.created_at}</span>
                    </div>
                </div>
                <button class="kb-entry-delete" data-id="${e.id}" title="删除">&times;</button>
            </div>`
            )
            .join('');

        kbList.querySelectorAll('.kb-entry').forEach((entry) => {
            entry.addEventListener('click', (e) => {
                if (e.target.classList.contains('kb-entry-delete')) return;
                inputEl.value = entry.dataset.concept;
                closeKnowledgeBase();
                sendMessage();
            });
        });

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
            .replace(/\s+/g, ' ')
            .replace(/[？?。.！!，,]+$/g, '')
            .trim();
    }

    // ======== 发送消息 ========
    async function sendMessage() {
        if (isLoading) return;
        const concept = normalizeInput(inputEl.value);
        if (!concept) return;

        welcomeEl.style.display = 'none';
        inputEl.value = '';
        inputEl.style.height = 'auto';

        // 直接用默认分类发送
        doSend(concept, defaultCategory);
    }

    // ======== 实际发送请求 ========
    async function doSend(concept, category) {
        concept = normalizeInput(concept || '');
        if (!concept) {
            inputEl.focus();
            return;
        }

        isLoading = true;
        sendBtn.disabled = true;
        loadingToast.style.display = 'flex';

        appendUserMessage(concept);

        try {
            const resp = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concept, category, history: conversationHistory }),
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

    // ======== 渲染函数 ========
    function appendUserMessage(content) {
        const div = document.createElement('div');
        div.className = 'message message-user';
        div.innerHTML = `<div class="bubble user-bubble">${escapeHtml(content)}</div>`;
        messagesEl.appendChild(div);
        scrollToBottom();
    }

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

    function appendErrorMessage(msg) {
        const div = document.createElement('div');
        div.className = 'message message-ai';
        div.innerHTML = `<div class="bubble ai-bubble error-bubble">${escapeHtml(msg)}</div>`;
        messagesEl.appendChild(div);
        scrollToBottom();
    }

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

    function scrollToBottom() {
        requestAnimationFrame(() => {
            messagesEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ======== 划词解释弹窗（可拖拽 + Ctrl多选） ========
    const wordPopup = document.getElementById('wordPopup');
    const wpWord = document.getElementById('wpWord');
    const wpBody = document.getElementById('wpBody');
    const wpClose = document.getElementById('wpClose');
    const wpFollowupBtn = document.getElementById('wpFollowupBtn');
    const wpInputRow = document.getElementById('wpInputRow');
    const wpInput = document.getElementById('wpInput');
    const wpSendBtn = document.getElementById('wpSendBtn');
    let explainTimer = null;
    let currentWord = '';
    let currentExplanation = '';
    let ctrlWords = [];       // Ctrl多选累积的词
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0, popupStartX = 0, popupStartY = 0;

    // ====== 弹窗拖拽 ======
    const wpHeader = wordPopup.querySelector('.wp-header');
    wpHeader.addEventListener('mousedown', (e) => {
        if (e.target === wpClose) return; // 不拦截关闭按钮
        isDragging = true;
        const rect = wordPopup.getBoundingClientRect();
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        popupStartX = rect.left;
        popupStartY = rect.top;
        wordPopup.style.transform = 'none'; // 拖拽时去掉 transform
        wordPopup.style.left = popupStartX + 'px';
        wordPopup.style.top = popupStartY + 'px';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        wordPopup.style.left = (popupStartX + e.clientX - dragStartX) + 'px';
        wordPopup.style.top = (popupStartY + e.clientY - dragStartY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // ====== 多词模式：Shift 切换 + 空格确认 ======
    let multiWordMode = false;
    let confirmedWords = [];
    let highlightSpans = [];

    // Shift 切换模式 / Esc 取消
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && multiWordMode) {
            cancelMultiWordMode();
            return;
        }
        if (e.key !== 'Shift') return;
        // 防止在输入框中触发
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();

        if (!multiWordMode) {
            // 进入模式
            multiWordMode = true;
            confirmedWords = [];
            showModeIndicator();
        } else {
            // 退出模式 → 批量解释
            exitMultiWordMode();
        }
    });

    // 空格确认选词
    document.addEventListener('keydown', (e) => {
        if (e.key !== ' ' || !multiWordMode) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();

        const sel = window.getSelection();
        const text = (sel?.toString() || '').trim();
        if (!text || text.length > 50) return;

        // 确保选区在消息/欢迎区
        const anchor = sel.anchorNode;
        if (!anchor) return;
        if (!messagesEl.contains(anchor) && !(welcomeEl && welcomeEl.contains(anchor))) return;

        // 去重加入
        if (!confirmedWords.includes(text)) {
            confirmedWords.push(text);
            // 高亮当前选区
            try {
                const range = sel.getRangeAt(0);
                highlightRange(range);
            } catch (e) { /* ignore */ }
        }
        sel.removeAllRanges();
        updateModeCount();
    });

    function showModeIndicator() {
        let el = document.getElementById('multiWordIndicator');
        if (!el) {
            el = document.createElement('div');
            el.id = 'multiWordIndicator';
            el.className = 'mw-indicator';
            document.body.appendChild(el);
        }
        el.innerHTML = '<span class="mw-dot"></span>多词模式 · 选词后按<kbd>空格</kbd>确认 · 再按<kbd>Shift</kbd>结束 · <a href="#" id="mwCancel">取消</a>';
        el.style.display = 'block';
        document.getElementById('mwCancel').addEventListener('click', (ev) => {
            ev.preventDefault();
            cancelMultiWordMode();
        });
    }

    function updateModeCount() {
        const el = document.getElementById('multiWordIndicator');
        if (el) {
            el.innerHTML = `<span class="mw-dot"></span>已选 <b>${confirmedWords.length}</b> 个词 · 按<kbd>空格</kbd>继续 · 按<kbd>Shift</kbd>结束 · <a href="#" id="mwCancel">取消</a>`;
            document.getElementById('mwCancel').addEventListener('click', (ev) => {
                ev.preventDefault();
                cancelMultiWordMode();
            });
        }
    }

    function hideModeIndicator() {
        const el = document.getElementById('multiWordIndicator');
        if (el) el.style.display = 'none';
    }

    function cancelMultiWordMode() {
        multiWordMode = false;
        confirmedWords = [];
        clearHighlights();
        hideModeIndicator();
    }

    function exitMultiWordMode() {
        multiWordMode = false;
        hideModeIndicator();
        if (confirmedWords.length >= 1) {
            showMultiWordPopup();
        } else {
            clearHighlights();
        }
    }

    // ====== 高亮管理 ======
    function highlightRange(range) {
        try {
            const span = document.createElement('mark');
            span.className = 'hl-word';
            range.surroundContents(span);
            highlightSpans.push(span);
        } catch (e) { /* 跨节点等情况，忽略 */ }
    }

    function clearHighlights() {
        highlightSpans.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                while (span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
                parent.normalize();
            }
        });
        highlightSpans = [];
    }

    // ====== 选区检测（普通拖选，单次解释） ======
    document.addEventListener('mouseup', () => {
        if (multiWordMode) return; // 多词模式下由空格处理
        clearTimeout(explainTimer);
        explainTimer = setTimeout(handleSelection, 200);
    });

    // 记录弹窗内点击
    let clickedInsidePopup = false;
    wordPopup.addEventListener('mousedown', (e) => {
        if (e.target !== wpClose && e.target.parentElement !== wpHeader) {
            clickedInsidePopup = true;
        }
    });

    // 点击弹窗外关闭（多词模式下不触发）
    document.addEventListener('mousedown', (e) => {
        if (multiWordMode) return;
        if (!wordPopup.contains(e.target)) {
            hidePopup();
        }
    });

    // 关闭按钮
    wpClose.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePopup();
    });

    // 追问按钮
    wpFollowupBtn.addEventListener('click', () => {
        wpInputRow.style.display = 'flex';
        wpInput.value = '';
        wpInput.focus();
    });

    // 发送追问
    wpSendBtn.addEventListener('click', sendFollowup);
    wpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendFollowup();
    });

    function hidePopup() {
        wordPopup.style.display = 'none';
        wordPopup.style.transform = '';
        wpInputRow.style.display = 'none';
        currentWord = '';
        currentExplanation = '';
        confirmedWords = [];
        clearHighlights();
        window.getSelection().removeAllRanges();
    }

    async function handleSelection() {
        if (clickedInsidePopup) { clickedInsidePopup = false; return; }

        const sel = window.getSelection();
        const text = (sel?.toString() || '').trim();

        if (!text || text.length > 50) { hidePopup(); return; }

        const anchor = sel.anchorNode;
        if (!anchor) return;
        if (!messagesEl.contains(anchor) && !(welcomeEl && welcomeEl.contains(anchor))) {
            hidePopup(); return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        positionPopup(rect);
        wordPopup.style.display = 'flex';
        wpInputRow.style.display = 'none';
        wpWord.textContent = text;
        wpBody.textContent = '查询中...';
        currentWord = text;

        try {
            const resp = await fetch('/api/quick-explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: text }),
            });
            const data = await resp.json();
            if (data.success) {
                currentExplanation = data.explanation;
                wpBody.textContent = currentExplanation;
            } else {
                hidePopup();
            }
        } catch (err) {
            hidePopup();
        }
    }

    function positionPopup(rect) {
        const popupH = 300;
        if (rect.top > popupH + 20) {
            wordPopup.style.top = (rect.top - 12) + 'px';
            wordPopup.style.transform = 'translate(-50%, -100%)';
        } else {
            wordPopup.style.top = (rect.bottom + 12) + 'px';
            wordPopup.style.transform = 'translate(-50%, 0)';
        }
        wordPopup.style.left = (rect.left + rect.width / 2) + 'px';
    }

    async function showMultiWordPopup() {
        if (confirmedWords.length === 0) return;

        // 用第一个高亮词的位置定位
        let rect = null;
        if (highlightSpans.length > 0) {
            rect = highlightSpans[0].getBoundingClientRect();
        } else {
            rect = { top: 200, bottom: 220, left: 400, width: 100 };
        }

        positionPopup(rect);
        wordPopup.style.display = 'flex';
        wpInputRow.style.display = 'none';
        wpWord.textContent = confirmedWords.join('、');
        wpBody.textContent = '查询中...';
        currentWord = confirmedWords.join('、');

        // 保存词列表，解释完后清理
        const wordsToExplain = [...confirmedWords];
        clearHighlights();
        confirmedWords = [];

        try {
            const resp = await fetch('/api/quick-explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: wordsToExplain }),
            });
            const data = await resp.json();
            if (data.success) {
                currentExplanation = data.explanation;
                wpBody.textContent = currentExplanation;
            }
        } catch (err) {
            wpBody.textContent = '请求失败';
        }
    }

    async function sendFollowup() {
        const question = wpInput.value.trim();
        if (!question || !currentWord) return;
        wpInput.value = '';
        wpBody.textContent = '思考中...';

        try {
            const resp = await fetch('/api/quick-explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: currentWord,
                    question: question,
                    context: currentExplanation,
                }),
            });
            const data = await resp.json();
            if (data.success) {
                currentExplanation = data.explanation;
                wpBody.textContent = currentExplanation;
            }
        } catch (err) {
            wpBody.textContent = '请求失败';
        }
    }
})();
