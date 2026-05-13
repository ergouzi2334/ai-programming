"""分类管理路由"""
from flask import Blueprint, request, jsonify
from backend.services.knowledge import load_categories, save_categories

bp = Blueprint('categories', __name__)


@bp.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({'success': True, 'categories': load_categories()})


@bp.route('/api/categories', methods=['POST'])
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


@bp.route('/api/categories/<name>', methods=['DELETE'])
def delete_category(name):
    cats = load_categories()
    if name not in cats:
        return jsonify({'success': False, 'error': '分类不存在'}), 404
    if len(cats) <= 1:
        return jsonify({'success': False, 'error': '至少保留一个分类'}), 400
    cats.remove(name)
    save_categories(cats)
    return jsonify({'success': True, 'categories': cats})
