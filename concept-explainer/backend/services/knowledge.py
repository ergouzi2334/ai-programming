"""知识库 + 分类管理"""
import json
import uuid
import re
from datetime import datetime
from backend.config import Config

# ======== AI 概念分类关键词 ========
AI_KEYWORDS = [
    'llm', '大模型', '大语言模型', '语言模型', 'gpt', 'chatgpt', 'claude', 'gemini',
    'deepseek', '文心一言', '通义千问', 'kimi', 'transformer', '注意力机制',
    '预训练', 'pre-train', '微调', 'fine-tune', 'fine-tuning', 'rlhf', 'dpo',
    '对齐', 'alignment', '幻觉', 'hallucination', 'temperature', 'top-p', 'top-k',
    'token', 'tokenizer', '分词', '参数', 'parameter', '算力', 'gpu', 'tpu',
    '推理', 'inference', '量化', 'quantization', '蒸馏', 'distillation',
    'lora', 'peft', '开源模型', '闭源模型', '多模态', 'multimodal',
    'claude code', 'cursor', 'copilot', 'github copilot', 'windsurf',
    'codex', 'vibe coding', 'trae', '通义灵码',
    'agent', '智能体', 'ai agent', 'function calling', '函数调用', 'tool use',
    '工具调用', 'autogpt', 'crewai', 'autogen', 'semantic kernel',
    'rag', '检索增强生成', '向量数据库', 'vector db', 'embedding', '嵌入',
    'langchain', 'llamaindex', 'pinecone', 'chroma', 'milvus', 'faiss',
    'mcp', 'model context protocol',
    '提示词', 'prompt', 'prompt engineering', '提示工程', 'few-shot',
    'zero-shot', 'chain of thought', 'cot', '思维链',
    'stable diffusion', 'midjourney', 'dall-e', '文生图', '文生视频',
    'tts', 'stt', 'asr', '语音合成', '语音识别', 'nlp', '自然语言处理',
    '计算机视觉', 'cv', '生成式', 'generative', 'aigc',
    'ollama', 'vllm', '模型部署', '模型服务', 'serving', 'api key',
    '机器学习', '深度学习', '神经网络', '反向传播', '梯度下降',
    '强化学习', '迁移学习', 'guardrails', '安全护栏',
    '上下文窗口', 'context window', '压缩', 'compaction',
]


def normalize_concept(text: str) -> str:
    """规范化输入：去空格、合并空白、去尾部标点"""
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[？?。.！!，,]+$', '', text)
    return text.strip()


def classify_concept(concept: str) -> str:
    """根据关键词判断概念属于哪个分类"""
    lower = concept.lower()
    for kw in AI_KEYWORDS:
        if kw in lower:
            return 'AI编程'
    return '编程基础知识'


# ======== 知识库 I/O ========
def load_knowledge() -> list:
    if Config.KNOWLEDGE_FILE.exists():
        try:
            return json.loads(Config.KNOWLEDGE_FILE.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            return []
    return []


def save_knowledge(entries: list):
    Config.KNOWLEDGE_FILE.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8'
    )


def add_to_knowledge(concept: str, category: str = '') -> dict:
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
    if len(entries) > Config.MAX_KNOWLEDGE_ENTRIES:
        entries = entries[:Config.MAX_KNOWLEDGE_ENTRIES]
    save_knowledge(entries)
    return entry


# ======== 分类 I/O ========
def load_categories() -> list:
    if Config.CATEGORIES_FILE.exists():
        try:
            cats = json.loads(Config.CATEGORIES_FILE.read_text(encoding='utf-8'))
            if isinstance(cats, list) and len(cats) > 0:
                return cats
        except (json.JSONDecodeError, OSError):
            pass
    return Config.DEFAULT_CATEGORIES.copy()


def save_categories(cats: list):
    Config.CATEGORIES_FILE.write_text(
        json.dumps(cats, ensure_ascii=False, indent=2), encoding='utf-8'
    )
