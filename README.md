# AI Web Editor — Chrome 扩展版

基于 LLM/AI 的浏览器网页元素实时编辑 Chrome 扩展，支持多模型、右键菜单、全局快捷键。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)

## 功能特性

### ✨ v1.9 新功能
- **Quick Commands** — 命令建议下拉框，支持 `/?` 前缀搜索
- **多语言翻译增强** — 自动检测页面语言 + 智能推荐目标语言
- **自定义主题编辑器** — 保存/加载/删除主题，预设 Dark/Light/Ocean/Green 四种风格
- **键盘快捷键管理器** — 在 popup 中记录自定义快捷键
- **全局热键支持** — Chrome Commands API 集成，默认 `Ctrl+Shift+E`

### 📦 v1.8 功能
- Element Inspector（元素检查器）— DOM 树导航 + Computed Style 查看

### 🔧 v1.7 功能
- Review Mode（代码审查模式）
- Snippet Library（代码片段库）
- Auto-Detect Language（自动检测语言）
- Code Highlight Editor（语法高亮编辑器）

## 安装使用

1. Chrome 浏览器打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目的 `src/` 目录
4. 页面右键菜单或工具栏图标即可开始使用

### 从 Chrome Web Store 安装
> 即将上线...

## 配置 AI 模型

在扩展 popup 中设置 AI 模型端点。默认支持：
- Qwen (通义千问) — `qwen3.6`
- 自定义 OpenAI 兼容 API

## 隐私政策
[查看隐私政策](privacy-policy.html)

## 开发

```bash
# 加载到 Chrome（开发者模式）
src/ → chrome://extensions/ → 加载已解压的扩展程序
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。
