# 模块: Content Script

**文件**: `src/content-script/content.js` (~565行, ~22KB)  
**样式**: `src/content/content.css` (~450行, ~8.3KB)

## 职责

- **元素选择模式**：浮动 ✦ 按钮 → 点击覆盖层高亮元素 → 选中目标
- **编辑面板**：三 tab 面板（AI Modify / Style Editor / History）
- **AI 指令执行**：发送自然语言指令到 Background，接收并应用修改
- **样式直接操作**：颜色、字体、边距等 CSS 属性实时修改
- **历史记录**：session 内追踪所有编辑操作，支持重放

## DOM 结构

```
document.body (注入页面)
├── #awe-trigger-btn          → 浮动 ✦ 按钮（右下角）
├── #awe-selection-overlay     → 半透明覆盖层（选择模式下激活）
├── #awe-editor-panel          → 编辑面板（右侧浮动，默认隐藏）
│   ├── #awe-panel-header      → 标题 + 关闭按钮 + (undo/redo)
│   ├── #awe-element-preview   → 选中元素标签和文本预览
│   ├── #awe-tabs              → AI / Style / History tab 切换
│   ├── #tab-ai                → AI 指令区（快捷按钮 + textarea + 发送）
│   ├── #tab-style             → 样式编辑器（颜色/字体/边距等）
│   ├── #tab-history           → 历史记录列表
│   └── #awe-status-msg        → 状态提示
├── #awe-toast                 → 全局 toast 通知
└── .awe-element-highlight     → 临时类：选中元素的高亮边框（动态添加/移除）
```

## 核心函数详解

### 1. 初始化 (IIFE 自执行)

```javascript
(function () {
  if (window.__awe_injected) return;       // 防重复注入
  window.__awe_injected = true;
  
  createTriggerBtn();                      // 创建 ✦ 浮动按钮
  createOverlay();                         // 创建选择覆盖层
  createEditorPanel();                     // 创建编辑面板（大量 innerHTML）
})();
```

### 2. 元素选择

| 函数 | 说明 |
|------|------|
| `toggleSelectMode()` | 切换选择模式，显示/隐藏覆盖层和 ✦ 按钮的 active 状态 |
| `handleElementClick(e)` | 处理覆盖层点击事件：跳过扩展自身元素 → 选中目标 → 高亮 → 更新预览 → 打开面板 |
| `handleElementHover(e)` | 选择模式下鼠标悬停时高亮预览（不选中） |
| `highlightElement(el)` / `clearHighlight()` | 添加/移除 `.awe-element-highlight` CSS 类实现视觉反馈 |

### 3. 面板交互

| 函数 | 说明 |
|------|------|
| `openPanel()` / `closePanel()` | 显示/隐藏编辑面板，关闭时清除高亮 |
| `updatePreview(el)` | 读取选中元素的 tag、文本（前120字符）、计算样式 → 填充预览区和样式 tab 默认值 |

### 4. AI 命令执行

`handleAICommand()` 是核心工作流：

```
1. 校验：是否选中元素 + 输入不为空
2. UI：按钮变禁用状态，显示 loading spinner
3. chrome.runtime.sendMessage({ action: 'ai-modify', command, elementText, elementTag })
4. Background 返回 response.success + newContent
   ├─ ✅ 成功 → 修改 selectedElement.textContent/innerHTML（处理单文本节点 vs 混合内容）
   │           → showStatus('AI modification applied!') → addToHistory()
   └─ ❌ 失败/无 API Key → applyLocalModification()（本地降级模式）
                           → showStatus('API not connected. Applied local modification.')
5. finally：恢复按钮状态
```

**降级模式 (`applyLocalModification`)**: 当 API 不可用时，执行简单文本处理：
- "translate Chinese" → `（AI翻译：原文...）`
- "shorter/concise" → 截断到一半词数
- "longer/detail" → 追加扩展说明文字
- 其他 → `[AI-Modified] 原文` 或 `<span style="color:#6366f1">[AI]</span> 原文`

### 5. 样式操作

所有样式修改**直接在 DOM 上应用**，不经过 Background：

```javascript
applyStyleAction(action, element) {
  setColor     → element.style.color = colorPicker.value
  setBgColor   → element.style.backgroundColor = colorPicker.value
  setFontSize  → element.style.fontSize = numberInput.value + 'px'
  setFontWeight → element.style.fontWeight = select.value
  setRadius    → element.style.borderRadius = numberInput.value + 'px'
  setOpacity   → element.style.opacity = numberInput.value
  setPadding   → element.style.padding = numberInput.value + 'px'
  setMargin    → element.style.margin = numberInput.value + 'px'
}
```

### 6. 历史记录

内存中维护 `historyStore[]` 数组（最多 20 条）：

```javascript
{
  command: "Rewrite this content",
  type: "ai" | "ai-local",
  data: { newContent: "..." } | null,
  time: "14:32:10",
  elementTag: "h2",
  actionId: 1717056730123   // Date.now() 唯一标识
}
```

- `addToHistory()` → 插入头部，限制长度，调用 `renderHistory()`
- `renderHistory()` → 生成 HTML 列表，为每个 item 绑定 click handler（重放修改）
- 重放逻辑：找到对应 entry，如果 type === 'ai' 且 data.newContent 存在，则 `selectedElement.textContent = newContent`

### 7. 快捷键

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isSelectingMode) toggleSelectMode();
    else if (isOpen) closePanel();
  }
});
```

## Content Script ↔ Background 消息协议

| 方向 | action | payload | response |
|------|--------|---------|----------|
| CS → BG | `ai-modify` | `{command, elementText, elementTag}` | `{success, newContent, error, needsApiKey}` |
| CS → BG | `save-api-key` | `{apiKey}` | `{success}` |
| CS → BG | `get-api-key` | — | `{apiKey}` |
| Popup → BG | `test-connection` | `{apiKey, provider, baseUrl}` | `{success, message/error}` |

## 已知限制

| 限制 | 影响 | 原因 |
|------|------|------|
| Shadow DOM 不生效 | 无法编辑 Shadow DOM 内的元素 | Content Script 无法穿透 shadow root |
| 历史不持久 | 刷新页面后历史记录丢失 | 仅存储在内存数组中，未使用 chrome.storage |
| HTTPS-only pages API 可能被拦截 | 某些网站禁止非 HTTPS 的 fetch | CSP + Mixed Content 限制 |
| Content Script 隔离 | 与页面 JS 全局变量完全隔离 | MV3 Shadow DOM isolation |
