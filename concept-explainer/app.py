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

# ======== System Prompt ========
SYSTEM_PROMPT = """你是一个编程与 AI 概念解释专家，专门帮助初学者理解复杂的技术概念。

# 最重要的规则：诚实面对未知

如果用户提问的概念你不认识、也完全没有网络资料可供参考——请直接回复 `UNKNOWN`（只回复这一个词）。宁可说不认识，也不要猜测或编造。

# 回答规则

用户提问时会附带概念类型标记和网络搜索资料。请根据提供的网络资料 + 自身知识生成回答：

- 如果网络资料充足：以网络资料为主要依据，用自身知识辅助解释
- 如果网络资料与你所知一致：用资料丰富细节，互相印证
- 如果网络资料较少但有自身知识：以自身知识为主，网络资料为补充
- 完全没有任何可用信息时：回复 `UNKNOWN`

请根据概念类型标记选择对应的第四部分结构：

**编程概念**（用户消息包含[编程概念]标记）：
## 是什么
用通俗易懂的语言解释这个概念的来源、核心思想和定义。用日常生活的比喻帮助理解，让零基础的人也能听懂。技术术语附英文原名。

## 有什么用
说明这个概念能解决什么问题，在哪些实际开发场景中会用到，为什么它很重要。

## 怎么用
说明如何正确地应用这个概念。包含使用步骤、注意要点、常见误区和最佳实践。

## 代码示例
给出 1-2 个具体可运行的代码示例，用注释详细说明每一行关键代码的作用。选择用户提问中提到的语言，未指定则使用 Python。

**AI 概念**（用户消息包含[AI概念]标记）：
## 是什么
用通俗易懂的语言解释这个概念的来源、核心思想和定义。用日常生活的比喻帮助理解。技术术语附英文原名。

## 有什么用
说明这个概念能解决什么问题，在 AI 工作流或工具链中处于什么位置。

## 怎么用
说明如何正确地应用这个概念。包含使用步骤、注意要点、常见误区。

## 实际应用
用 1-2 个具体的实际场景说明这个概念在真实项目或产品中是如何落地的。用自然语言描述清楚即可。

# 语言风格

- 全部使用中文回答
- 语气轻松友好，像学长给学弟学妹讲解
- 每个部分都要有实质性内容
- 总长度控制在 600-2000 字之间"""


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


def add_to_knowledge(concept: str) -> dict:
    """添加一条记录到知识库，返回该条目"""
    entries = load_knowledge()
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
    if not data or not data.get('concept', '').strip():
        return jsonify({'success': False, 'error': '请输入一个概念'}), 400

    concept = normalize_concept(data['concept'])
    if len(concept) > 500:
        return jsonify({'success': False, 'error': '输入过长，请控制在500字以内'}), 400

    history = data.get('history', [])

    if not DEEPSEEK_API_KEY:
        return jsonify({
            'success': False,
            'error': '未找到 DEEPSEEK_API_KEY，请在项目目录创建 .env 文件并设置密钥',
        }), 500

    # 判断概念类型
    category = classify_concept(concept)
    tag = '[AI概念]' if category == 'AI编程' else '[编程概念]'

    # 先搜索网络
    search_results = search_web(concept)

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

        # 添加到知识库
        kb_entry = add_to_knowledge(concept)

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
