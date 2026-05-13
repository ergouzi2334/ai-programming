"""聊天相关路由：/api/chat 和 /api/quick-explain"""
from flask import Blueprint, request, jsonify
from backend.config import Config
from backend.prompts import SYSTEM_PROMPT, QUICK_PROMPT, MULTI_PROMPT, FOLLOWUP_PROMPT
from backend.services.deepseek import call_deepseek
from backend.services.search import search_web
from backend.services.knowledge import normalize_concept, classify_concept, add_to_knowledge

bp = Blueprint('chat', __name__)


@bp.route('/api/chat', methods=['POST'])
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

    if not Config.DEEPSEEK_API_KEY:
        return jsonify({
            'success': False,
            'error': '未找到 DEEPSEEK_API_KEY，请在项目目录创建 .env 文件并设置密钥',
        }), 500

    category = classify_concept(concept)
    tag = '[AI概念]' if category == 'AI编程' else '[编程概念]'

    search_query = f'{concept} 教程 用法 GitHub B站 官方文档'
    search_results = search_web(search_query)

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

        if content.strip().upper() == 'UNKNOWN':
            return jsonify({
                'success': False,
                'error': f'抱歉，未找到关于"{concept}"的相关知识。',
            }), 404

        kb_entry = add_to_knowledge(concept, user_category)

        return jsonify({
            'success': True,
            'content': content,
            'concept': concept,
            'category': category,
            'kb_entry': kb_entry,
            'from_web': bool(search_results),
        })
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'API 请求失败：{str(e)}'}), 500


@bp.route('/api/quick-explain', methods=['POST'])
def quick_explain():
    data = request.get_json()
    words = data.get('words', [])
    word = normalize_concept(data.get('word', ''))
    if not word and not words:
        return jsonify({'success': False}), 400
    if word and len(word) > 100:
        return jsonify({'success': False}), 400

    if not Config.DEEPSEEK_API_KEY:
        return jsonify({'success': False}), 500

    question = data.get('question', '').strip()
    context = data.get('context', '').strip()

    if question:
        system_msg = FOLLOWUP_PROMPT.format(word=word, context=context)
        user_msg = question
        max_tok = 250
    elif words:
        system_msg = MULTI_PROMPT
        user_msg = '、'.join(words)
        max_tok = 300
    else:
        system_msg = QUICK_PROMPT
        user_msg = word
        max_tok = 150

    try:
        content = call_deepseek(
            [{'role': 'system', 'content': system_msg},
             {'role': 'user', 'content': user_msg}],
            temperature=0.3,
            max_tokens=max_tok,
        )
        return jsonify({'success': True, 'explanation': content.strip()})
    except Exception:
        return jsonify({'success': False}), 500
