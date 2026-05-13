"""统一配置，通过 python-dotenv 加载 .env 文件"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # concept-explainer/
load_dotenv(BASE_DIR / '.env')


class Config:
    DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
    DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions'
    DEEPSEEK_MODEL = 'deepseek-chat'
    DEEPSEEK_TIMEOUT = 60
    DEEPSEEK_MAX_TOKENS = 4096

    KNOWLEDGE_FILE = BASE_DIR / 'knowledge.json'
    CATEGORIES_FILE = BASE_DIR / 'categories.json'
    DEFAULT_CATEGORIES = ['AI编程', '编程基础知识']
    MAX_KNOWLEDGE_ENTRIES = 200
