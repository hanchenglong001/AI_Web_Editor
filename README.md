# AI Web Editor — Chrome Extension

点击网页任意元素，用 AI 实时修改内容或样式。

[English version below](#english)

---

## 功能特性

- **元素选择**：点击 ✦ 按钮，然后点击页面上任意元素即可选中
- **AI 智能修改**：输入自然语言指令（如"把这段标题改得更吸引人"），或使用快捷命令一键处理
- **样式编辑器**：可视化修改颜色、字体、圆角、透明度、内外边距等
- **历史面板**：一键回退或重新应用之前的修改
- **多 API 支持**：兼容 OpenAI GPT-4o-mini、Google Gemini，以及所有 OpenAI 兼容接口（Together AI、本地 Ollama、Azure OpenAI 等）

## 安装方法（开发者模式）

1. 打开 Chrome，访问 `chrome://extensions/`
2. 右上角开启 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择本项目根目录
5. 安装完成！页面右下角会出现 ✦ 浮动按钮

## 使用方法

1. **点击 ✦ 按钮**（页面右下角），进入元素选择模式
2. **鼠标悬停在元素上**会看到紫色高亮框预览
3. **点击目标元素**，AI 编辑面板自动弹出
4. **输入指令**或使用快捷按钮：
   - 改写 / 简化 / 翻译成中文 / 扩写 / 缩写
   - 专业语气 / 增加趣味性
5. **点击"应用 AI 修改"**，效果实时体现在页面上

## API 配置

点击扩展图标（拼图→✦）可以：
- 设置 OpenAI API Key、Google API Key 或自定义 API 端点
- 选择 GPT-4o-mini、Gemini Pro 或其他 OpenAI 兼容模型

## 支持/购买

如果你觉得这个项目对你有帮助，欢迎通过扫码支持我们：

<img src="support.png" width="200" alt="收款码">

---

## English

# AI Web Editor - Chrome Extension

Click any element on a webpage and use AI to modify its content or style in real-time.

## Features

- **Element Selection**: Click the ✦ button, then click any element on any webpage
- **AI Modification**: Type a natural language command (e.g., "Rewrite this title to be catchier") or use quick-action buttons
- **Style Editor**: Change colors, fonts, border-radius, opacity, padding, margin visually
- **History Panel**: Re-apply previous modifications with one click
- **Multi-API Support**: OpenAI GPT-4o-mini, Google Gemini, and any OpenAI-compatible API (Together AI, Ollama, Azure OpenAI, etc.)

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (top-right toggle)
3. Click **"Load unpacked"**
4. Select this project's root directory
5. The extension is now loaded! You'll see a ✦ button in the bottom-right corner of every page

## Usage

1. **Click the ✦ button** to enter selection mode
2. **Hover over elements** to preview (purple highlight)
3. **Click an element** — the AI editor panel opens
4. **Type a command** or use quick-action buttons:
   - Rewrite / Simplify / Translate (CN/EN/JA/KO/ES) / Expand / Shorten
   - Professional Tone / Make it Fun / E-commerce Product Desc / Twitter Style / Weibo Style
   - Fix Grammar / SEO Optimise / Bullet Points / Code Explanation / Add Comments
5. **Apply AI modification** — changes appear in real-time on the page

## API Configuration

Click the extension icon (puzzle piece → ✦) to:
- Set your OpenAI API key, Google API key or custom API endpoint
- Choose between GPT-4o-mini, Gemini Pro, or any OpenAI-compatible provider

## Monetization Ideas

### Freemium Model
- **Free tier**: Local modifications, basic style editing (up to 10/day)
- **Premium ($4.99/mo)**: Unlimited AI modifications, advanced prompts, priority API access
- **Team ($9.99/mo)**: Shared prompt library, collaboration features

### One-time Purchase / Open Source Core + Paid Plugin
- Core editor on Chrome Web Store (free)
- Premium AI addon sold separately

### Affiliate Monetization
- E-commerce mode: detect product pages, offer style/content optimization tools
- Partner with web design tools/services for referral links

### White-label / Enterprise
- Sell custom-branded version to agencies and developers

## Tech Stack

- **Manifest V3** Chrome extension architecture
- Vanilla JavaScript (no build step)
- CSS Grid + Flexbox for responsive UI
- chrome.storage.sync for persistent settings
- OpenAI-compatible REST API integration
- Google Gemini Pro integration

## File Structure

```
├── src/
│   ├── manifest.json           # Extension manifest (MV3)
│   ├── background/             # Service worker
│   │   └── background.js       # AI API handling, message routing
│   ├── content-script/         # Injected into webpages
│   │   └── content.js          # Element selection, editor panel logic
│   ├── content/                # CSS injected into webpages
│   │   └── content.css         # All panel and trigger styles
│   ├── popup/                  # Extension options UI
│   │   ├── popup.html          # Settings popup
│   │   └── popup.js            # Popup logic (API config)
│   └── icons/                  # Plugin icon assets
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── README.md                   # This file
├── CHANGELOG.md                # Version history
├── LICENSE                     # MIT License
├── TODO.md                     # Roadmap
└── .gitignore                  # Git ignore rules
```

## API Integration

The extension supports any OpenAI-compatible endpoint:

| Provider | Base URL | Model |
|----------|----------|-------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini |
| Google Gemini | `https://generativelanguage.googleapis.com` | gemini-pro |
| Together AI | `https://api.together.xyz/v1` | meta-llama/Llama-3-8b-chat-hf |
| Ollama (local) | `http://localhost:11434/api/openai` | any local model |
| Azure OpenAI | `{endpoint}/openai/deployments/{dep}/chat/completions?api-version=2024-02-01` | custom |

## License

MIT