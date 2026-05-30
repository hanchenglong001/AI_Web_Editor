# 模块: Popup 设置页

**文件**: `src/popup/popup.html` (~119行) + `src/popup/popup.js` (~107行)

## 职责

- **API 配置入口**：用户在此设置 Provider、Base URL（Custom 模式）、API Key
- **连接验证**：点击保存后通过 Background 的 `test-connection` 验证 API Key 是否有效
- **使用指引**：内置 How to Use + Quick Tips 帮助文档

## UI 结构

```
┌─────────────────────────────┐
│ ✦ AI Web Editor              │ ← Header (渐变色背景)
│ Select any element...        │   Popup 尺寸: 360px 宽
├─────────────────────────────┤
│ API Configuration            │
│ Provider: [OpenAI ▼]         │
│ API Base URL:               │   (仅 Custom 模式可见)
│ API Key:                    │
│ [Save & Connect]             │
│ ● Connected / Disconnected   │
├─────────────────────────────┤
│ How to Use                   │
│ 1. Click ✦ button            │
│ 2. Click any element         │
│ 3. Type a command            │
│ 4. See AI modifications      │
├─────────────────────────────┤
│ Quick Tips                   │
│ Keyboard: ESC                │
│ Styles tab: colors...        │
│ History tab: re-apply...     │
├─────────────────────────────┤
│ v1.0.0 · About               │ ← Footer (版本号硬编码)
└─────────────────────────────┘
```

## popup.js 核心逻辑

### 初始化 (`DOMContentLoaded`)

```javascript
// 1. 加载保存的配置
chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl'], result => {
  if (result.apiProvider) providerSelect.value = result.apiProvider;
  if (result.apiBaseUrl) apiBaseUrlInput.value = result.apiBaseUrl;
  if (result.apiKey) { /* 显示已连接状态 */ }
});

// 2. Provider 切换时显示/隐藏 Base URL 输入框
providerSelect.addEventListener('change', () => {
  const visible = providerSelect.value === 'custom';
  apiBaseUrlInput.parentElement.style.display = visible ? 'block' : 'none';
});

// 3. 初始状态隐藏 Base URL
apiBaseUrlInput.parentElement.style.display = 'none';
```

### 保存按钮点击流程

```javascript
saveBtn.onclick:
  1. 读取表单值 (apiKey, provider, baseUrl)
  2. 校验：Custom provider 必须填 baseUrl
  3. chrome.storage.sync.set({ apiKey, apiProvider, apiBaseUrl })
  4. 如果 API Key 存在，发送 test-connection 消息到 Background
     └─ 成功: statusEl = "● Connected — API ready" (绿色)
     └─ 失败: statusEl = "● Saved (use in extension)" (橙色)
  5. 恢复按钮状态
```

### Toast 通知

自定义函数 `showToast(msg, success)`，创建固定定位的 toast 元素：
- success → 绿色背景 (`#22c55e`)
- error → 红色背景 (`#ef4444`)
- 2秒后自动移除

## 已知问题

| 问题 | 严重程度 | 修复建议 |
|------|---------|---------|
| 版本号硬编码 `v1.0.0` | 低 | 应使用 `chrome.runtime.getManifest().version` 动态读取 |
| 无模型选择器 | 中 | v1.1 功能丢失，需重新实现 Model Selector |
| 无使用量统计 tab | 中 | v1.1 的 Usage Stats Tab 丢失 |
