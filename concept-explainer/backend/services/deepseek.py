"""DeepSeek API 客户端"""
import requests
from backend.config import Config


def call_deepseek(messages: list, temperature: float = 0.7, max_tokens: int = None) -> str:
    """调用 DeepSeek API，返回回复文本"""
    if not Config.DEEPSEEK_API_KEY:
        raise ValueError('DEEPSEEK_API_KEY 未配置，请在项目目录创建 .env 文件')

    resp = requests.post(
        Config.DEEPSEEK_BASE_URL,
        headers={
            'Authorization': f'Bearer {Config.DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'model': Config.DEEPSEEK_MODEL,
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens or Config.DEEPSEEK_MAX_TOKENS,
        },
        timeout=Config.DEEPSEEK_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']
