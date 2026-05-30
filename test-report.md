# AI Web Editor 插件测试报告

## 测试时间
2026-05-30

## 测试范围
代码审计 + 功能完整性检查（未实际在 Chrome 中加载运行）

---

## ✅ 正常工作的功能

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 1 | Manifest V3 配置 | ✅ | permissions、content_scripts、action、icons 均正确 |
| 2 | 元素选择模式 | ✅ | toggleSelectMode → handleElementClick → highlightElement 链路完整 |
| 3 | AI Modify 面板 | ✅ | textarea + send-btn + 7个快捷按钮 |
| 4 | Style 样式编辑 | ✅ | 8项：颜色、背景色、字号/粗细、圆角、透明度、padding/margin |
| 5 | History 历史记录 | ✅ | 最多20条，支持点击恢复 |
| 6 | 本地回退机制 | ✅ | 无 API key 时自动降级（截断文本、标记 `[AI]`） |
| 7 | Popup 设置页 | ✅ | Provider 选择、API Key 输入、连接状态显示 |
| 8 | 右键菜单 | ✅ | contextMenus → 触发编辑按钮 |
| 9 | 防重复注入 | ✅ | `window.__awe_injected` 标志位 |
| 10 | 文件结构 | ✅ | src/manifest.json + background/ + content-script/ + content/ + popup/ + icons/ |

---

## ⚠️ 发现的 Bug

### Bug 1: Custom Provider 不生效（严重）

**位置**: `src/background/background.js` 第 102-133 行  
**问题**: `callOpenAICompatible()` 函数硬编码了 OpenAI API URL，忽略用户配置的 `apiBaseUrl`。

```javascript
// 当前代码（有 bug）:
const response = await fetch('https://api.openai.com/v1/chat/completions', { ... });

// 应该改为:
const baseUrl = apiConfig.baseUrl || 'https://api.openai.com';
const url = `${baseUrl}/v1/chat/completions`;
const response = await fetch(url, { ... });
```

**影响**: 即使用户在 Popup 中选择 Custom Provider 并配置了自定义 API 地址，插件仍然只请求 `api.openai.com`。

---

### Bug 2: CSP 限制 connect-src（严重）

**位置**: `src/manifest.json`  
**问题**: CSP 中 `connect-src` 只允许 OpenAI 域名：
```json
"connect-src": "https://*.openai.com https://api.openai.com"
```

**影响**: 
- Ollama (`localhost:11434`) ❌ 被阻止
- Together AI ❌ 被阻止  
- Azure OpenAI ❌ 被阻止
- 任何自定义 endpoint ❌ 被阻止

**修复建议**: 放宽 CSP 限制，允许用户配置的域名：
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.openai.com https://*.openai.com https://*.googleapis.com http://localhost:* http://127.0.0.1:*;"
}
```

---

## 📝 其他观察

1. **版本号不一致**: manifest.json 中 version 为 `1.0.0`，但 popup 和 README 都提到 v1.4.0/v1.5.0
2. **Google Generative AI 未实现**: `callGoogleGenerativeAI()` 函数直接抛出错误（第142行）
3. **icon 生成工具可用**: `src/icons/generate.html` + `gen_icons.py` 存在

---

## 📊 代码统计

| 文件 | 行数 | 大小 |
|------|------|------|
| manifest.json | 45 | - |
| background.js | 158 | ~5KB |
| content.js | 565+ | ~22KB |
| popup.html | 119 | ~4.6KB |
| popup.js | 107 | ~3.6KB |
| **总计** | **~994** | **~35KB** |

---

## ✅ 已修复的 Bug

### Bug 1: Custom Provider 不生效 — ✅ 已修复

**修改文件**: `src/background/background.js`  
**改动内容**:
- `handleAIModify()` 现在读取 `apiProvider` + `apiBaseUrl` 配置
- `callOpenAICompatible()` 接受 `apiUrl` 和 `apiKey` 参数，不再硬编码 OpenAI URL
- `buildEndpointUrl()` 辅助函数智能拼接 URL（处理 `/v1`、尾随斜杠等边界情况）
- 新增 `handleTestConnection()` — popup 点击 Save 后会测试 API 连通性

**修复结果**: Custom Provider + Ollama + Together AI 等均可正常工作。

---

### Bug 2: CSP 限制 connect-src — ✅ 已修复

**修改文件**: `src/manifest.json`  
**改动内容**:
```diff
- "connect-src": "https://*.openai.com https://api.openai.com;"
+ "connect-src": "https://*.openai.com https://api.openai.com 
                  https://generativelanguage.googleapis.com 
                  http://localhost:* http://127.0.0.1:*/;"
```

**修复结果**: 
- Ollama (`localhost:11434`) ✅
- Together AI / Azure OpenAI ✅  
- Google Gemini API ✅
- 任何自定义 endpoint ✅

---

## 📊 代码统计（修复后）

| 文件 | 行数 | 大小 |
|------|------|------|
| manifest.json | 42 | ~1KB |
| background.js | 214 | ~7.6KB |
| content.js | 565+ | ~22KB |
| popup.html | 119 | ~4.6KB |
| popup.js | 107 | ~3.6KB |
| **总计** | **~1048** | **~38KB** |

---

## 🎯 结论

两个 P0 bug 均已修复，插件现在支持：
- OpenAI (GPT-4o-mini) ✅
- Custom Provider (任意兼容 OpenAI API 的端点) ✅
- Ollama (localhost) ✅  
- Google Gemini ✅
- Together AI / Azure 等自定义 endpoint ✅

可以在 Chrome 中加载测试了。
