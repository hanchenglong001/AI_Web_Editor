# AI 修改完整流程

描述用户从点击元素到看到 AI 修改结果的全链路。

## 完整消息流

```mermaid
sequenceDiagram
    participant User as 用户
    participant CS as Content Script<br/>(content.js)
    participant Popup as Popup (popup.js)
    participant BG as Background<br/>(background.js)
    participant Storage as chrome.storage.sync
    participant AI as AI API后端

    Note over User,Storage: === 配置阶段 ===
    User->>Popup: 打开扩展图标 → 输入 Provider + Base URL + API Key
    Popup->>Storage: set({apiKey, apiProvider, apiBaseUrl})
    Popup->>BG: sendMessage('test-connection', {apiKey, provider, baseUrl})
    BG->>Storage: getSync(['apiKey','apiProvider','apiBaseUrl'])
    Storage-->>BG: {apiKey, apiProvider, apiBaseUrl}
    alt provider == 'openai'
        BG->>AI: test API call (OpenAI format)
    else provider == 'custom'
        BG->>AI: test API call (Custom URL)
    end
    AI-->>BG: response (success or error)
    BG-->>Popup: {success, message/error}
    Popup->>User: 显示连接状态 ● Connected / Disconnected

    Note over User,Storage: === 选择元素阶段 ===
    User->>CS: 点击 ✦ 按钮 → 进入选择模式
    CS->>CS: 显示 #awe-selection-overlay (半透明全屏)
    User->>CS: 鼠标悬停 → highlightElement()
    User->>CS: 点击目标元素
    CS->>CS: selectedElement = target
    CS->>CS: highlightElement(target)  // 添加 .awe-element-highlight
    CS->>CS: updatePreview(target)     // 读取 tag, text, computed styles
    CS->>CS: openPanel()               // 显示编辑面板

    Note over User,AI: === AI 修改阶段 ===
    User->>CS: 在 textarea 输入指令 "Rewrite this title"
    User->>CS: 点击 "Apply AI Modification" 按钮
    CS->>CS: showStatus('Sending to AI...')
    CS->>BG: sendMessage({action:'ai-modify', command, elementText, elementTag})
    
    BG->>Storage: getSync(['apiKey','apiProvider','apiBaseUrl'])
    Storage-->>BG: {apiKey='sk-***', apiProvider='openai', apiBaseUrl='' }
    
    alt provider == 'openai'
        BG->>AI: POST https://api.openai.com/v1/chat/completions<br/>{model:'gpt-4o-mini', messages:[{system, user}]}<br/>Header: Authorization: Bearer sk-***
    else provider == 'google'
        BG->>AI: POST generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=***
    else provider == 'custom'
        BG->>AI: POST buildEndpointUrl(apiBaseUrl)/chat/completions<br/>{model:'gpt-4o-mini', messages:[...]}<br/>Header: Authorization: Bearer ***
    end
    
    AI-->>BG: {choices:[{message:{content:"重写后的标题文本"}}]}
    BG->>BG: extractAIContent(response)  // 剥离 ```codeblock 标记
    BG-->>CS: {success:true, newContent:"重写后的标题文本"}
    
    CS->>CS: selectedElement.textContent = response.newContent
    CS->>CS: addToHistory(cmd, 'ai', {newContent})
    CS->>User: showStatus('AI modification applied! ✓')
    
    Note over User,AI: === 降级模式 (无 API Key) ===
    BG-->>CS: {success:false, needsApiKey:true}
    CS->>CS: applyLocalModification(selectedElement, cmd)
    // 执行简单本地文本处理（截断、添加 [AI] 前缀等）
    CS->>User: showStatus('API not connected. Applied local modification.')
```

## 关键数据对象

### Content Script → Background 请求体

```javascript
{
  action: 'ai-modify',
  command: 'Rewrite this content to be more engaging',  // 用户输入的指令
  elementText: 'Current page text content (max ~200 chars)',  // 元素文本内容
  elementTag: 'h2'   // 元素标签名
}
```

### Background → Content Script 响应体

```javascript
{
  success: true,                    // API 调用是否成功
  newContent: "AI 生成的修改文本",  // 修改后的内容（成功时）
  error: "401 Unauthorized: ...",   // 错误信息（失败时）
  needsApiKey: false                // 是否需要用户配置 API Key
}
```

### chrome.storage.sync 存储结构

```javascript
{
  apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',    // OpenAI-compatible API Key
  apiProvider: 'openai' | 'custom' | 'google',  // 选择的 Provider
  apiBaseUrl: ''  // Custom 模式的完整 Base URL（如 https://ollama.local:11434）
}
```

## AI Prompt 工程

### System Prompt (OpenAI-Compatible)

```
You are a helpful AI that rewrites webpage content. 
The user has selected an element on a webpage and wants you to modify it.
Only return the NEW content for this element. Do NOT include markdown formatting like backticks or code blocks.
Do NOT explain your changes — just give me the modified text.
```

### User Prompt 格式

```
Command: "Translate this to Chinese"

Current content:
Welcome to our product page!

Please rewrite this according to the command.
```

## 响应解析（extractAIContent）

同时支持两种 API 响应格式的提取：

| Provider | 路径 | 示例 |
|----------|------|------|
| OpenAI / Compatible | `response.choices[0].message.content` | `{ choices: [{ message: { content: "..." }}] }` |
| Google Gemini | `response.candidates[0].content.parts[0].text` | `{ candidates: [{ content: { parts: [{ text: "..." }}] }] }` |

两者都执行 markdown 剥离：`.replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim()`

## 降级策略

当 API Key 未配置或 API 调用失败时，Content Script 的 `applyLocalModification()` 执行本地文本处理：

| 指令关键词 | 本地处理行为 |
|-----------|-------------|
| "translate Chinese" | 包装为 `（AI翻译：原文前30字...）` |
| "shorter / concise" | 截断到约一半的词数，追加 `...` |
| "longer / detail" | 在原文后追加扩展说明文字 |
| 其他任何指令 | 添加 `[AI-Modified] ` 前缀，或使用 `<span style="color:#6366f1">[AI]</span>` 标记 |
