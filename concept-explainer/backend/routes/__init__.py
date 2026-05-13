"""路由注册"""
from backend.routes.chat import bp as chat_bp
from backend.routes.knowledge import bp as knowledge_bp
from backend.routes.categories import bp as categories_bp


def register_routes(app):
    app.register_blueprint(chat_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(categories_bp)
