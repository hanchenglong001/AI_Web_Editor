# AI Web Editor — 项目知识库

Chrome 扩展：点击网页任意元素，用自然语言通过 AI 实时修改其内容或样式。

## 技术栈

- **Manifest V3**（Chrome Extension）
- **纯 Vanilla JS** — 无构建步骤、无框架依赖
- **AI 后端** — OpenAI GPT-4o-mini / Google Gemini / 任何 OpenAI-compatible API（Ollama, Azure, vLLM...）

## 模块地图

| 模块 | 文件 | 职责 |
|------|------|------|
| [Background Service Worker](modules/background.md) | `src/background/background.js` | AI API 调用、消息路由、配置管理 |
| [Content Script](modules/content-script.md) | `src/content-script/content.js` | 元素选择、AI 编辑面板、DOM 交互 |
| [Content CSS](modules/content-css.md) | `src/content/content.css` | 扩展注入页面的样式（隔离命名空间） |
| [Popup](modules/popup.md) | `src/popup/popup.html/js` | API 配置入口（Provider/Base URL/Key） |
| [Manifest](modules/manifest.md) | `src/manifest.json` | 扩展清单、权限、CSP、入口定义 |

## 核心工作流

详见 [workflows/](workflows/) 目录：

- **ai-modify-flow.md** — AI 修改的完整消息传递链路
- **dev-process.md** — 开发工作流程（superpowers TDD、subagent 分工）

## 代码结构

```
src/
├── background/
│   └── background.js       # Service Worker：API 调用、消息路由
├── content-script/
│   └── content.js          # 注入页面的脚本：元素选择、编辑面板
├── content/
│   └── content.css         # 注入页面的样式（.awe- 前缀隔离）
├── icons/                  # 扩展图标 + SVG 生成脚本
├── popup/
│   ├── popup.html          # 设置弹窗 UI
│   └── popup.js            # 设置弹窗逻辑（保存 API Key/Provider）
└── manifest.json           # Manifest V3 清单
```

**关键约束：**
- 所有源码必须在 `src/` 子目录下，根目录不得有旧版平铺的 `.js/.html` 文件
- Content Script 使用 `.awe-` CSS 前缀避免与页面样式冲突
- Popup 和 Content Script 通过 `chrome.storage.sync` 共享配置

## 快速开始

1. Chrome 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `src/` 目录
4. 点击页面右下角 ✦ 按钮进入元素选择模式
5. 点击任意元素 → 输入自然语言指令 → AI 修改生效

## 版本历史

| 版本 | 日期 | 核心功能 |
|------|------|----------|
| v1.0.0 | 2026-05-30 | 初始发布：元素选择、AI 面板（AI/Style/History三 tab）、多 Provider 基础支持 |
| *(v1.1-v1.4 代码丢失)* | — | 原始开发历史在 gitee 完整保留，GitHub 因目录重构导致代码丢失（见 dev-process.md） |

## Wiki 生成信息

- **仓库 SHA**: `HEAD`
- **生成时间**: 2026-05-30
- **生成工具**: Hermes Agent + code-wiki skill
