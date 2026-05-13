"""DuckDuckGo 搜索（使用 Instant Answer API，无需第三方包）"""
import requests


def search_web(query: str, max_results: int = 5) -> str:
    """搜索 DuckDuckGo，返回拼接的搜索结果文本"""
    try:
        resp = requests.get(
            'https://api.duckduckgo.com/',
            params={'q': query, 'format': 'json', 'no_html': 1},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        pieces = []

        abstract = data.get('AbstractText', '')
        if abstract:
            pieces.append(abstract)

        for topic in data.get('RelatedTopics', [])[:max_results]:
            if isinstance(topic, dict) and topic.get('Text'):
                pieces.append(topic['Text'])

        return '\n\n---\n\n'.join(pieces) if pieces else ''
    except Exception as e:
        print(f'[搜索失败] {e}')
        return ''
