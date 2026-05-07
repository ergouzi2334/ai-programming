"""
概念解释器 — Flask 后端
调用 DeepSeek API 生成编程与 AI 概念的结构化解释，含知识库功能
"""
import os
import re
import json
import uuid
import requests
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, render_template
from ddgs import DDGS

app = Flask(__name__)

BASE_DIR = Path(__file__).parent
KNOWLEDGE_FILE = BASE_DIR / 'knowledge.json'
CATEGORIES_FILE = BASE_DIR / 'categories.json'

DEFAULT_CATEGORIES = ['AI编程', '编程基础知识']

# ======== System Prompt ========
SYSTEM_PROMPT = """你是一个编程与 AI 概念解释专家，用户是正在学习的初学者。你的回答需要通俗易懂、偏实战、善于用类比。

# 最重要规则

如果用户提问的概念你不认识、也完全没有网络资料可供参考——直接回复 `UNKNOWN`，不要编造。

# 回答结构（按以下顺序组织，自然分段，不用"## 标题"）

**一句话总结** — 回答第一句用 **加粗** 一句话讲清这个概念是什么，让用户立刻有印象。

**含义 + 类比** — 用大白话解释这个概念，配合一个生活中的类比帮助理解。如果概念有英文全称，附上。

**特点 + 对比** — 列出 2-4 个核心特点。对比相似概念（如果有的话），说明它们之间的区别和各自适用场景，帮用户建立知识网络。

**怎么用** — 这是重点部分，要详细。请从 GitHub 开源项目、X（Twitter）开发者、B站技术博主、官方文档中搜集该概念的常见用法，优先介绍 AI 教学领域博主讲解过的高频用法。每种用法后面用 ⭐ 标注使用频率（5级：⭐⭐⭐⭐⭐ 极高频~⭐ 极少用），按频率从高到低排列。格式如：
    ⭐⭐⭐⭐⭐ 最常用的用法：xxxx
    ⭐⭐⭐⭐ 次高频用法：xxxx
    ⭐⭐⭐ 偶尔使用：xxxx

**常见误区** — 指出初学者容易理解错的地方、容易混淆的点、常见的错误用法。让用户少踩坑。

**实战示例** — 编程概念给出可直接运行的 Python 代码（或用户指定的语言），代码带注释。AI 概念给出具体的操作流程或配置示例。如果概念不适合代码，用步骤描述替代。

**学习建议** — 1-2 句话告诉用户：这个概念适合在什么项目里实践？掌握之后下一步学什么相关概念？

# 语言风格

- 全部中文，轻松直接，像学长当面讲解
- 精简务实，每个字都要有信息量，不写废话
- 代码和步骤优先于理论解释
- 如果有网络资料，以网络资料为准
- 总长度 500-1200 字"""



def search_web(query: str) -> str:
    """用 DuckDuckGo 搜索，返回拼接后的搜索结果文本"""
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                results.append(f"标题：{r['title']}\n内容：{r['body']}")
        return '\n\n---\n\n'.join(results) if results else ''
    except Exception as e:
        print(f'[搜索失败] {e}')
        return ''


def normalize_concept(text: str) -> str:
    """规范化输入：去空格、合并空白、去尾部标点，大小写保留"""
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)        # 合并连续空格/换行
    text = re.sub(r'[？?。.！!，,]+$', '', text)  # 去尾部标点
    return text.strip()

# ======== 概念分类关键词 ========
AI_KEYWORDS = [
    # 大模型 & 基础
    'llm', '大模型', '大语言模型', '语言模型', 'gpt', 'chatgpt', 'claude', 'gemini',
    'deepseek', '文心一言', '通义千问', 'kimi', 'transformer', '注意力机制',
    '预训练', 'pre-train', '微调', 'fine-tune', 'fine-tuning', 'rlhf', 'dpo',
    '对齐', 'alignment', '幻觉', 'hallucination', 'temperature', 'top-p', 'top-k',
    'token', 'tokenizer', '分词', '参数', 'parameter', '算力', 'gpu', 'tpu',
    '推理', 'inference', '量化', 'quantization', '蒸馏', 'distillation',
    'lora', 'peft', '开源模型', '闭源模型', '多模态', 'multimodal',
    # AI 开发工具
    'claude code', 'cursor', 'copilot', 'github copilot', 'windsurf',
    'codex', 'vibe coding', 'trae', '通义灵码',
    # Agent & 工具
    'agent', '智能体', 'ai agent', 'function calling', '函数调用', 'tool use',
    '工具调用', 'autogpt', 'crewai', 'autogen', 'semantic kernel',
    # RAG & 知识
    'rag', '检索增强生成', '向量数据库', 'vector db', 'embedding', '嵌入',
    'langchain', 'llamaindex', 'pinecone', 'chroma', 'milvus', 'faiss',
    # MCP & 协议
    'mcp', 'model context protocol',
    # 提示工程
    '提示词', 'prompt', 'prompt engineering', '提示工程', 'few-shot',
    'zero-shot', 'chain of thought', 'cot', '思维链',
    # AI 应用
    'stable diffusion', 'midjourney', 'dall-e', '文生图', '文生视频',
    'tts', 'stt', 'asr', '语音合成', '语音识别', 'nlp', '自然语言处理',
    '计算机视觉', 'cv', '生成式', 'generative', 'aigc',
    # 部署 & 服务
    'ollama', 'vllm', '模型部署', '模型服务', 'serving', 'api key',
    # 概念 & 安全
    '机器学习', '深度学习', '神经网络', '反向传播', '梯度下降',
    '强化学习', '迁移学习', 'guardrails', '安全护栏',
    '上下文窗口', 'context window', '压缩', 'compaction',
]


def classify_concept(concept: str) -> str:
    """根据关键词判断概念属于哪个分类"""
    lower = concept.lower()
    for kw in AI_KEYWORDS:
        if kw in lower:
            return 'AI编程'
    return '编程基础知识'


# ======== 知识库存储 ========
def load_knowledge() -> list:
    if KNOWLEDGE_FILE.exists():
        try:
            return json.loads(KNOWLEDGE_FILE.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            return []
    return []


def save_knowledge(entries: list):
    KNOWLEDGE_FILE.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8'
    )


def add_to_knowledge(concept: str, category: str = '') -> dict:
    """添加一条记录到知识库，返回该条目"""
    entries = load_knowledge()
    if not category:
        category = classify_concept(concept)
    entry = {
        'id': str(uuid.uuid4())[:8],
        'concept': concept,
        'category': category,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
    }
    entries.insert(0, entry)
    # 最多保留 200 条
    if len(entries) > 200:
        entries = entries[:200]
    save_knowledge(entries)
    return entry


# ======== 分类管理 ========
def load_categories() -> list:
    """加载自定义分类列表"""
    if CATEGORIES_FILE.exists():
        try:
            cats = json.loads(CATEGORIES_FILE.read_text(encoding='utf-8'))
            if isinstance(cats, list) and len(cats) > 0:
                return cats
        except (json.JSONDecodeError, OSError):
            pass
    return DEFAULT_CATEGORIES.copy()


def save_categories(cats: list):
    CATEGORIES_FILE.write_text(
        json.dumps(cats, ensure_ascii=False, indent=2), encoding='utf-8'
    )


# ======== API Key ========
def load_api_key() -> str:
    candidates = [
        BASE_DIR / '.env',
        BASE_DIR.parent / '.env',
        Path.home() / '.env',
    ]
    for path in candidates:
        if path.exists():
            for line in path.read_text(encoding='utf-8').splitlines():
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key == 'DEEPSEEK_API_KEY':
                        return val
    return os.environ.get('DEEPSEEK_API_KEY', '')


DEEPSEEK_API_KEY = load_api_key()
DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'


def call_deepseek(messages: list) -> str:
    resp = requests.post(
        DEEPSEEK_URL,
        headers={
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'model': 'deepseek-chat',
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 4096,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


# ======== 路由 ========
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '请输入一个概念'}), 400

    concept = normalize_concept(data.get('concept', ''))
    if not concept:
        return jsonify({'success': False, 'error': '请输入一个概念'}), 400
    if len(concept) > 500:
        return jsonify({'success': False, 'error': '输入过长，请控制在500字以内'}), 400

    user_category = data.get('category', '')
    history = data.get('history', [])

    if not DEEPSEEK_API_KEY:
        return jsonify({
            'success': False,
            'error': '未找到 DEEPSEEK_API_KEY，请在项目目录创建 .env 文件并设置密钥',
        }), 500

    # 判断概念类型
    category = classify_concept(concept)
    tag = '[AI概念]' if category == 'AI编程' else '[编程概念]'

    # 先搜索网络（附加教程/用法关键词，覆盖教育博主来源）
    search_query = f'{concept} 教程 用法 GitHub B站 官方文档'
    search_results = search_web(search_query)

    # 构建消息：搜索结果始终作为上下文
    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    messages.extend(history[-20:])

    if search_results:
        user_msg = (
            f'{tag} {concept}\n\n'
            f'（以下是从网络搜索到的相关资料，请参考这些资料来补充和验证你的知识：）\n\n'
            f'网络资料：\n{search_results}'
        )
    else:
        user_msg = f'{tag} {concept}'

    messages.append({'role': 'user', 'content': user_msg})

    try:
        content = call_deepseek(messages)

        # 完全没有可用信息
        if content.strip().upper() == 'UNKNOWN':
            return jsonify({
                'success': False,
                'error': f'抱歉，未找到关于"{concept}"的相关知识。',
            }), 404

        # 添加到知识库（使用用户选择的分类）
        kb_entry = add_to_knowledge(concept, user_category)

        return jsonify({
            'success': True,
            'content': content,
            'concept': concept,
            'category': category,
            'kb_entry': kb_entry,
            'from_web': bool(search_results),
        })
    except requests.Timeout:
        return jsonify({'success': False, 'error': 'AI 响应超时，请重试'}), 504
    except requests.RequestException as e:
        return jsonify({'success': False, 'error': f'API 请求失败：{str(e)}'}), 500
    except requests.Timeout:
        return jsonify({'success': False, 'error': 'AI 响应超时，请重试'}), 504
    except requests.RequestException as e:
        return jsonify({'success': False, 'error': f'API 请求失败：{str(e)}'}), 500


# ======== 划词快速解释（含追问） ========
QUICK_PROMPT = """用1-2句话（60字以内）解释用户选中的词，通俗易懂。只输出解释本身，不要前缀后缀。"""

MULTI_PROMPT = """用简洁的语言逐个解释以下名词（每个30字以内），格式为"名词：解释"。通俗易懂。只输出解释本身。"""

FOLLOWUP_PROMPT = """用户针对一个概念提出了追问。请针对追问内容简明回答（100字以内），通俗易懂。只输出回答本身，不要前缀后缀。

概念：{word}
当前解释：{context}"""


@app.route('/api/quick-explain', methods=['POST'])
def quick_explain():
    data = request.get_json()
    words = data.get('words', [])  # 多词模式
    word = normalize_concept(data.get('word', ''))
    if not word and not words:
        return jsonify({'success': False}), 400
    if word and len(word) > 100:
        return jsonify({'success': False}), 400

    if not DEEPSEEK_API_KEY:
        return jsonify({'success': False}), 500

    question = data.get('question', '').strip()
    context = data.get('context', '').strip()

    if question:
        # 追问模式
        system_msg = FOLLOWUP_PROMPT.format(word=word, context=context)
        user_msg = question
        max_tok = 250
    elif words:
        # 多词解释
        system_msg = MULTI_PROMPT
        user_msg = '、'.join(words)
        max_tok = 300
    else:
        # 单次解释
        system_msg = QUICK_PROMPT
        user_msg = word
        max_tok = 150

    try:
        resp = requests.post(
            DEEPSEEK_URL,
            headers={
                'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'deepseek-chat',
                'messages': [
                    {'role': 'system', 'content': system_msg},
                    {'role': 'user', 'content': user_msg},
                ],
                'temperature': 0.3,
                'max_tokens': max_tok,
            },
            timeout=15,
        )
        resp.raise_for_status()
        content = resp.json()['choices'][0]['message']['content'].strip()
        return jsonify({'success': True, 'explanation': content})
    except Exception:
        return jsonify({'success': False}), 500


# ======== 分类 API ========
@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({'success': True, 'categories': load_categories()})


@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name or len(name) > 20:
        return jsonify({'success': False, 'error': '分类名不能为空且不超过20字符'}), 400
    cats = load_categories()
    if name in cats:
        return jsonify({'success': False, 'error': '分类已存在'}), 409
    cats.append(name)
    save_categories(cats)
    return jsonify({'success': True, 'categories': cats})


@app.route('/api/categories/<name>', methods=['DELETE'])
def delete_category(name):
    cats = load_categories()
    if name not in cats:
        return jsonify({'success': False, 'error': '分类不存在'}), 404
    if len(cats) <= 1:
        return jsonify({'success': False, 'error': '至少保留一个分类'}), 400
    cats.remove(name)
    save_categories(cats)
    return jsonify({'success': True, 'categories': cats})


# ======== 知识库 API ========
@app.route('/api/knowledge', methods=['GET'])
def get_knowledge():
    category = request.args.get('category', '')
    entries = load_knowledge()
    if category:
        entries = [e for e in entries if e.get('category') == category]
    return jsonify({'success': True, 'entries': entries})


@app.route('/api/knowledge/<entry_id>', methods=['DELETE'])
def delete_knowledge(entry_id):
    entries = load_knowledge()
    entries = [e for e in entries if e.get('id') != entry_id]
    save_knowledge(entries)
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, port=5001)
