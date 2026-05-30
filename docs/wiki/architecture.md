# 系统架构

## 概述

AI Web Editor 是一个 Chrome Manifest V3 扩展，由三个核心组件构成：

1. **Background Service Worker** — 后端 API 代理，负责与 AI 模型通信
2. **Content Script** — 注入页面 DOM，提供元素选择和编辑面板
3. **Popup** — 用户配置入口（API Key、Provider、Base URL）

三者在 Chrome Extension 生命周期中独立运行，通过 `chrome.storage.sync` 和 `chrome.runtime.sendMessage` 通信。

## 系统流程图

```mermaid
flowchart TD
    User((用户)) --> Action[点击扩展图标]
    User --> SelectMode[点击 ✦ 按钮进入选择模式]
    User --> ContextMenu["右键 → AI Web Editor 子菜单"]

    subgraph Popup ["Popup (独立窗口)"]
        P_Config[API 配置界面]
        P_Save[保存 chrome.storage.sync]
    end

    subgraph ContentScript ["Content Script (注入页面)"]
        Overlay[元素选择覆盖层]
        Panel[编辑面板: AI/Style/History]
        DOMManip[DOM 修改操作]
    end

    subgraph Background ["Background Service Worker"]
        MsgRouter[消息路由分发]
        APIProxy[AI API 代理]
        ConfigRead["读取 chrome.storage.sync"]
        TestConn[连接测试]
    end

    AIExt{{"扩展图标"}} --> Action
    Action --> P_Config
    P_Config --> P_Save
    P_Save --> Storage[(chrome.storage<br/>.sync)]

    SelectMode --> Overlay
    Overlay --> ElementClick["点击元素"]
    ElementClick --> Panel
    ContextMenu --> Panel

    Panel --> MsgSend["chrome.runtime.sendMessage"]
    MsgSend --> MsgRouter
    MsgRouter --> ConfigRead
    ConfigRead --> APIProxy

    AIProxy[OpenAI/Gemini/Custom API]

    Storage -.-> ConfigRead
    APIProxy -->|JSON Response| APIProxy
    APIProxy --> Response["AI 返回修改内容"]
    Response --> DOMManip
    DOMManip --> User

    TestConn --> P_Config
```

## 通信机制

### 消息传递链路

```mermaid
sequenceDiagram
    participant U as 用户
    participant CS as Content Script<br/>(content.js)
    participant BG as Background<br/>(background.js)
    participant S as chrome.storage
    participant AI as AI API<br/>(OpenAI/Gemini...)

    U->>CS: 点击元素，输入指令
    CS->>BG: sendMessage({action:'ai-modify', command, elementText})
    BG->>S: getSync(['apiKey','apiProvider','apiBaseUrl'])
    S-->>BG: {apiKey, apiProvider, apiBaseUrl}
    alt provider == 'openai'
        BG->>AI: POST /v1/chat/completions (OpenAI format)
    else provider == 'google'
        BG->>AI: POST generateContent (Gemini format)
    else provider == 'custom'
        BG->>AI: POST baseUrl/v1/chat/completions
    end
    AI-->>BG: {choices:[{message:{content}}]}
    BG-->>CS: {success:true, newContent:"..."}
    CS->>CS: 修改 selectedElement.textContent/innerHTML
    U->>U: 看到页面元素被修改
```

### 配置同步机制

```mermaid
sequenceDiagram
    participant P as Popup
    participant S as chrome.storage.sync
    participant BG as Background

    P->>S: set({apiKey, apiProvider, apiBaseUrl})
    Note over P,S: 异步存储，非阻塞
    BG->>S: get(['apiKey', 'apiProvider', 'apiBaseUrl'])
    S-->>BG: {apiKey, apiProvider, apiBaseUrl}
    Note over BG,S: Background 每次 API 调用前重新读取

```

## CSP 策略

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://*.openai.com https://api.openai.com https://generativelanguage.googleapis.com http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:;"
  }
}
```

- `connect-src` 允许 OpenAI、Google Gemini、以及本地 API（Ollama/LM Studio/vLLM）
- 通过通配符 `http://localhost:*` 和 `http://127.0.0.1:*` 支持任意端口的本地模型服务

## 关键设计决策

| 决策 | 原因 |
|------|------|
| Manifest V3 | Chrome 已弃用 MV2，V3 使用 Service Worker（非持久化） |
| Vanilla JS 无构建 | 简化安装流程，直接加载 src/ 目录即可调试 |
| Background 代理 API | Content Script 不能直接调用 AI API（CSP + CORS），必须经 Service Worker |
| `.awe-` CSS 前缀 | 避免注入的样式与页面原有样式冲突 |
| `chrome.storage.sync` 共享配置 | Popup 和 Background 都在同一个扩展上下文中，sync storage 是跨组件共享状态的标准方式 |

## 数据流总结

1. **配置**：Popup 保存 → `chrome.storage.sync` ← Background 读取 → AI API 调用
2. **编辑**：Content Script 选择元素 → `sendMessage('ai-modify')` → Background → AI API → 返回结果 → Content Script 修改 DOM
3. **样式**：Content Script 直接操作 `element.style.*`（无需后台）
4. **历史**：Content Script 内存中维护 historyStore 数组，session 生命周期内有效
