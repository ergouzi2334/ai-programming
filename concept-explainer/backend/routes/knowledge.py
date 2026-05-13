"""知识库路由"""
from flask import Blueprint, request, jsonify
from backend.services.knowledge import load_knowledge, save_knowledge

bp = Blueprint('knowledge', __name__)


@bp.route('/api/knowledge', methods=['GET'])
def get_knowledge():
    category = request.args.get('category', '')
    entries = load_knowledge()
    if category:
        entries = [e for e in entries if e.get('category') == category]
    return jsonify({'success': True, 'entries': entries})


@bp.route('/api/knowledge/<entry_id>', methods=['DELETE'])
def delete_knowledge(entry_id):
    entries = load_knowledge()
    entries = [e for e in entries if e.get('id') != entry_id]
    save_knowledge(entries)
    return jsonify({'success': True})
