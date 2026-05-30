# 模块: Background Service Worker

**文件**: `src/background/background.js` (214行, ~7.9KB)

## 职责

- **消息路由分发**：监听 Content Script 和 Popup 发来的所有 runtime message
- **AI API 代理调用**：读取用户配置，转发到正确的 AI 提供商后端
- **连接测试**：Popup 保存设置后验证 API Key 是否有效
- **上下文菜单管理**：注册右键菜单，提供"快速编辑"入口

## 消息处理映射表

| message.action | 函数 | 说明 |
|----------------|------|------|
| `ai-modify` | `handleAIModify()` | Content Script 发来指令，代理 AI API 调用 |
| `save-api-key` | — | 保存 API Key（向后兼容） |
| `get-api-key` | — | 读取当前 API Key |
| `test-connection` | `handleTestConnection()` | Popup 验证设置是否生效 |

## 关键函数详解

### handleAIModify(command, elementText, elementTag, sendResponse)

Content Script 调用此入口发送 AI 修改请求。

```
流程：
1. chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl'])
2. 根据 provider 选择 API 函数：
   - 'openai'    → callOpenAICompatible() → api.openai.com/v1/chat/completions
   - 'custom'    → callOpenAICompatible() → buildEndpointUrl(baseUrl) + /chat/completions
   - 'google'    → callGoogleGenerativeAI() → generativelanguage.googleapis.com
   - 其他        → fallback to custom or OpenAI
3. 解析响应提取 AI 返回的修改文本（处理 OpenAI/Gemini 两种格式）
4. sendResponse({success, newContent}) → Content Script 应用到 DOM
```

**错误处理：**
- 无 API Key → `{success: false, needsApiKey: true}`，Content Script 使用本地降级模式
- API 调用失败 → `{success: false, error: message}`，同样触发降级

### callOpenAICompatible(command, elementText, apiUrl, apiKey)

标准 OpenAI-compatible 格式的聊天补全请求。

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "You are a helpful AI that rewrites webpage content..."},
    {"role": "user", "content": "Command: \"rewrite\". Current content: <element text>"}
  ],
  "max_tokens": 1000
}
```

Headers: `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`

### callGoogleGenerativeAI(command, elementText, apiKey)

Google Gemini 专用调用。使用 key 查询参数认证，非 Authorization header。

```
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}
Body: {contents: [{parts: [{text: systemPrompt}, {text: command + current content}]}], generationConfig: {maxOutputTokens: 1000}}
```

### buildEndpointUrl(baseUrl)

智能拼接 Custom Provider 的完整 API endpoint URL。处理三种 baseUrl 格式：

| 输入的 baseUrl | 最终 URL |
|---------------|----------|
| `https://api.example.com/v1` | `https://api.example.com/v1/chat/completions` |
| `https://api.example.com/` | `https://api.example.com/v1/chat/completions` |
| `https://api.example.com` | `https://api.example.com/v1/chat/completions` |

### extractAIContent(response)

统一解析两种 API 响应格式，剥离 markdown 代码块标记。

```javascript
// OpenAI: response.choices[0].message.content
// Gemini: response.candidates[0].content.parts[0].text
// 两者都执行：.replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim()
```

## Service Worker 生命周期注意

Chrome MV3 的 Service Worker 是**短暂存活**的——无消息时会被 Chrome 自动回收。因此：

- **不要依赖全局变量持久化状态**（如配置缓存）——每次 API 调用都重新从 storage 读取
- `chrome.runtime.onInstalled` 在首次安装和每次扩展更新时触发，用于创建上下文菜单
- `chrome.runtime.onMessage` 是响应 Content Script 的唯一入口

## 已知限制

| 限制 | 影响 | 备注 |
|------|------|------|
| Service Worker 不持久 | 无内存中的配置缓存 | 每次调用都读 storage，有轻微延迟但可靠 |
| model 硬编码为 gpt-4o-mini | 无法切换模型 | popup UI 没有模型选择器（v1.1 功能丢失） |
| test-connection 是尽力而为 | API 可能拒绝"test"命令 | 只要设置保存到 storage，extension 内仍可使用 |
