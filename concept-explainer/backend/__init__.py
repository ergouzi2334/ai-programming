"""Flask 应用工厂"""
from flask import Flask, send_from_directory
from pathlib import Path

FRONTEND_DIST = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'


def create_app():
    app = Flask(__name__, static_folder=None)

    from backend.routes import register_routes
    register_routes(app)

    # 生产模式：提供 Vue 构建后的静态文件
    @app.route('/')
    def index():
        if FRONTEND_DIST.exists():
            return send_from_directory(str(FRONTEND_DIST), 'index.html')
        return '前端尚未构建，请执行 cd frontend && npm run build', 503

    @app.route('/assets/<path:filename>')
    def assets(filename):
        return send_from_directory(str(FRONTEND_DIST / 'assets'), filename)

    return app
