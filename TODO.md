# TODO — AI Web Editor Chrome Extension

## 🔴 High Priority (马上做)

### 1. Chrome Web Store 发布流程
- [ ] 创建完整的扩展图标（SVG → PNG 多尺寸, 48x48/128x128 高清）
- [ ] 编写 Web Store listing: 描述、截图、宣传图 (1400x560 banner)
- [ ] 生成打包 ZIP (`chrome://extensions/` → Developer mode → Generate packed extension)
- [ ] 提交审核（$5 one-time developer fee required）
- [ ] 设置定价策略: free + in-extension upgrade for premium features

### 2. 付费订阅 / 后端服务
- [ ] 集成 Stripe Payment Links 或 Gumroad 作为支付网关
- [ ] 实现"解锁高级功能"的逻辑 (daily limit 提升到 500+)
- [ ] 在 popup 中显示升级提示（当用户接近 daily limit 时）
- [ ] 支持试用: 注册用户获得免费 AI credits

### 3. 更多 AI 命令模板
- [x] ~~电商场景~~ ✅ Added in v1.2 (product-desc, tweet-style, weibo-style)
- [x] ~~社交媒体~~ ✅ Already included
- [x] ~~代码场景~~ ✅ Added explain-code, add-comments
- [x] ~~邮件场景~~ ✅ Added professional-email, fix-grammar
- [ ] 新增: Markdown 转纯文本 / JSON → 表格 / 语音转写整理
- [ ] 新增: SEO meta description 生成、OG tags 优化
- [ ] 自定义 prompt 模板 — 用户可保存/编辑自己的快捷命令

## 🟡 Medium Priority (近期迭代)

### 4. 协作与分享
- [x] **上下文菜单右键编辑** — contextMenus API 已实现 (Edit with AI / Translate CN / Translate EN / Shorten / Open Panel)
- [x] **导出为完整 HTML 文件** — 📄 按钮保留所有 AI 修改
- [ ] 生成"编辑快照"链接 (保存当前页面+AI修改后的对比)
- [ ] 团队共享 prompt 模板库
- [ ] 导出为 Markdown / JSON 格式

### 5. 版本同步 — v1.4 ✅ DONE
- [x] manifest.json 版本号: v1.4.0
- [x] context menu rich submenu implementation
- [x] Full page HTML export with modification preservation
- [x] CHANGELOG.md 已更新至 v1.4 (2026-05-30)
- [x] 支持同时选中多个元素（Shift+Click）
- [x] 对选中的所有元素应用相同 AI 指令（✨ Apply to All）
- [x] 实时预览所有修改效果 + index badge 编号

### 6. 浏览器增强
- [ ] Favicon 自定义 — 根据页面主题自动调整 ✦ 按钮颜色
- [ ] Side panel 支持 (Chrome side panel API, for complex edits)
- [ ] Tab-aware: 记住上次编辑的 tab，跨 tab 恢复上下文
- [ ] 右键菜单元素选择后，面板可折叠为非模态浮窗

### 7. AI Providers 扩展
- [ ] Google Gemini / Claude / Llama 原生支持 (已在 manifest CSP 中预留)
- [ ] 内置轻量模型（通过 WebAssembly 本地运行）— 完全离线可用
- [x] Together AI 兼容接口已支持
- [ ] 多个 provider 同时配置，智能选择最快/最便宜的

## 🟢 Nice to Have

### 8. Analytics & Feedback
- [ ] 集成简单的使用统计 (用户可关闭)
- [ ] 内置反馈按钮 — "报告问题" / "建议功能"
- [ ] A/B 测试不同 prompt 模板的效果

### 9. Monetization Features
- [x] Usage limits 已在 v1.1 实现
- [ ] Freemium: 每天 N 次免费 AI 调用，付费解锁无限
- [ ] One-time unlock: $9.99 买断高级功能
- [ ] Affiliate mode: 电商页面自动推荐优化服务 (赚佣金)
- [ ] White-label: 卖给 Web 设计公司做定制版

### 10. Performance & Polish
- [ ] CSS animations use `transform` only (GPU accelerated)
- [ ] Debounce hover highlights for better performance on large pages
- [ ] Service worker caching for repeated API calls
- [ ] Memory leak check: cleanup when navigating to new page
- [ ] 页面中大量 DOM 元素时优化选择性能

### 11. 多语言 / 国际化 (i18n)
- [ ] popup 和面板 UI 支持英文/中文/日文切换
- [ ] prompt 模板的本地化翻译包

## 🐛 Known Issues

### 1. Content script 在 Shadow DOM 页面中不生效
- 需要 additional `@import` or content script injection into shadow roots

### 2. HTTPS-only pages 的 API call 可能被 CORS 拦截
- 需要确保 CSP 包含所有可能的 API endpoints

### 3. Popup HTML 中的版本号硬编码
- 应该从 manifest.json 动态读取

### 4. 目录结构冗余 — v1.5 待清理
- [ ] 根目录存在重复文件: `background.js` vs `background/background.js`, `content.css` vs `content/content.css`, `content-script.js` vs `content/content.js`, `popup.html/js` vs `popup/popup.html/js`
- [ ] 统一为 flat 结构或 subdirectory 结构之一，避免混淆

### 5. Service Worker background.js CSP 未包含 Ollama/Azure
- [ ] manifest.json 的 CSP connect-src 缺少 `http://localhost:11434` (Ollama) 和 Azure endpoint
- [ ] 自定义 API endpoint（如 vLLM、LM Studio）也需动态加入 CSP

---

## 📊 版本快照 (2026-05-30)

| 项目 | 状态 |
|------|------|
| 当前版本 | **v1.4.0** ✅ |
| Quick Commands | 20+ 个 (含本地 fallback) |
| API 支持 | OpenAI compatible + Together AI + Ollama + Azure |
| Undo/Redo | ✅ v1.1 |
| Export (HTML/CSS/Full Page) | ✅ v1.1/v1.4 |
| Theme Toggle | ✅ v1.1 |
| Usage Limits | ✅ v1.1, 可配置 |
| Context Menu | ✅ v1.4 — rich submenu |
| Batch Edit (Multi-Select) | ✅ v1.3 — Shift+Click |
| 文件数量 | ~20 个源文件 |
| Git Commits | 9 次 |
| Working Tree Status | **Dirty** — TODO.md updated with v1.5 issues |
