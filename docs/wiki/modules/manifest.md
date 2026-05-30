# 模块: Manifest V3 清单

**文件**: `src/manifest.json` (~42行, ~1.2KB)

## 当前版本配置

```json
{
  "manifest_version": 3,
  "name": "AI Web Editor",
  "version": "1.4.0",
  "description": "Click any element on a webpage and use AI to modify its content or style in real-time.",
}
```

## 权限声明

| 权限 | 用途 | 代码引用位置 |
|------|------|-------------|
| `activeTab` | 允许 content script 注入到用户当前标签页 | manifest `content_scripts.matches: ["<all_urls>"]` |
| `storage` | Background 读取/写入 chrome.storage.sync | background.js 中的 `chrome.storage.sync.get/set` |
| `contextMenus` | 右键菜单子菜单注册 | background.js 中的 `chrome.contextMenus.create()` |
| `scripting` | 通过 context menu 触发 content script | background.js 中的 `chrome.scripting.executeScript()` |

## Host Permissions

```json
"host_permissions": ["<all_urls>"]
```

允许在任意网站注入 content script。这是必要的，因为扩展要在所有网页上工作。

## Service Worker（Background）

```json
"background": {
  "service_worker": "background/background.js"
}
```

MV3 使用 `service_worker` 而非 MV2 的 `scripts`。Service Worker 在空闲时被 Chrome 回收，不持久运行。

## Content Scripts

```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content-script/content.js"],
  "css": ["content/content.css"],
  "run_at": "document_idle"
}]
```

- `document_idle`：在页面加载完成后注入，不影响页面性能
- CSS 自动隔离到 Shadow DOM（MV3 行为）

## Action（扩展图标）

```json
"action": {
  "default_popup": "popup/popup.html",
  "default_icon": {"16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png"}
}
```

点击扩展图标弹出 `popup.html`。

## Icons

与 Action 使用相同的图标资源：16px, 48px, 128px PNG。

生成方式：运行 `src/icons/generate.html` + `gen_icons.py`，从 SVG 源文件生成各尺寸 PNG。

## CSP (Content Security Policy)

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://*.openai.com https://api.openai.com https://generativelanguage.googleapis.com http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:;"
}
```

| 指令 | 允许来源 | 目的 |
|------|---------|------|
| `script-src` | `'self'` | 只允许扩展自身的脚本，禁止内联/外联外部 JS |
| `connect-src` | OpenAI、Gemini、localhost*、127.0.0.1* | AI API 调用的目标域名 |
| `img-src` | `'self'`, `data:`, `blob:` | 扩展图标和动态图片资源 |

## 路径约定

所有文件路径相对 `src/` 目录。安装扩展时选择 `src/` 作为根目录。

```
src/manifest.json            ← 加载时以此目录为根
src/background/background.js
src/content-script/content.js
src/content/content.css
src/popup/popup.html
src/icons/icon16.png, icon48.png, icon128.png
```
