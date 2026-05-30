# 模块: Content CSS

**文件**: `src/content/content.css` (~450行, ~8.3KB)

## 职责

定义所有注入页面的 UI 组件样式，使用 `.awe-` 前缀命名空间隔离页面原有样式。

## CSS 变量与主题

（如果文件中定义了 CSS 变量，在此记录）

## 选择器命名规范

所有类名以 `awe-` 开头：
- `.awe-quick-btn` — AI 快捷操作按钮
- `.awe-quick-commands` — 快捷命令容器
- `.awe-element-highlight` — 选中元素的边框高亮
- `.awe-tab-btn` / `.awe-tab-panel` — Tab 切换组件
- `.awe-style-group` / `.awe-style-row` — 样式编辑器控件组
- `.awe-history-item` — 历史记录条目
- `.awe-spinner` / `.awe-status-msg` — 加载状态和消息提示

## 布局策略

| 组件 | CSS 定位方式 | z-index | 说明 |
|------|-------------|---------|------|
| ✦ 浮动按钮 | fixed, bottom-right | 高 | 始终可见，跟随滚动 |
| 选择覆盖层 | full-page overlay | 极高 | 透明但拦截所有点击事件 |
| 编辑面板 | fixed, right side | 极高 | 默认 hidden，选中元素后显示 |
| Toast 通知 | fixed, bottom-center | 中等 | 短暂显示后自动消失 |

## 动画

- Panel 出现使用 CSS `transition`（opacity + transform）
- 高亮效果使用边框动画（border 闪烁/脉冲）

## 响应式

面板宽度固定，不随页面缩放变化。按钮尺寸适配移动端触控。

## 关键样式规则

| 选择器 | 作用 |
|--------|------|
| `#awe-trigger-btn` | ✦ 浮动触发按钮，右下角固定定位 |
| `#awe-selection-overlay.active` | 激活时的半透明全屏覆盖层 |
| `#awe-editor-panel` | 主编辑面板容器 |
| `.awe-quick-btn` | AI 快捷命令按钮样式 |
| `#awe-command-input` | AI 指令文本输入框 |
| `#awe-send-btn` | "Apply AI Modification" 提交按钮 |
| `#tab-style > .awe-style-group` | 每个样式调节器（颜色/字体等）的容器 |
