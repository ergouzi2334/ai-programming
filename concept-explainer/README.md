# 概念解释器 — 编程与 AI 知识助手

输入任何编程或 AI 概念，AI 自动从四个维度生成结构化解释，附带用法频率标注和划词即时解释。

## 功能

- **结构化解释**：一句话总结 → 含义+类比 → 特点+对比 → 怎么用（⭐频率标注）→ 常见误区 → 实战示例 → 学习建议
- **联网搜索**：未知概念自动搜索网络获取最新信息
- **划词解释**：选中回答中任意词，上方弹出简短解释
- **知识库**：搜索历史自动归档，支持自定义分类
- **默认分类**：设置默认分类后提问自动保存，无需每次选择

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python Flask |
| AI | DeepSeek API（OpenAI 兼容） |
| 搜索 | DuckDuckGo（ddgs） |
| 前端 | 原生 HTML/CSS/JS + marked.js |

## 快速启动

```bash
cd concept-explainer
pip install -r requirements.txt
python app.py
```

浏览器打开 `http://127.0.0.1:5001`

## 项目结构

```
concept-explainer/
├── app.py                 # Flask 后端（API 路由 + AI 调用 + 搜索）
├── requirements.txt       # Python 依赖
├── templates/
│   └── index.html         # 前端页面
├── static/
│   ├── css/style.css      # 绿色主题样式
│   └── js/main.js         # 交互逻辑
├── knowledge.json         # 知识库数据（自动生成）
└── categories.json        # 自定义分类（自动生成）
```

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | 发送概念，获取解释 |
| `/api/quick-explain` | POST | 划词快速解释 |
| `/api/knowledge` | GET/DELETE | 知识库管理 |
| `/api/categories` | GET/POST/DELETE | 分类管理 |
