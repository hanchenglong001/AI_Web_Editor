# TODO — AI Web Editor Chrome Extension

## 🔴 High Priority (马上做)

### 1. Chrome Web Store 发布流程
- [ ] 创建完整的扩展图标（SVG → PNG 多尺寸）
- [ ] 编写 Web Store listing: 描述、截图、宣传图
- [ ] 生成打包 ZIP (`chrome://extensions/` → Developer mode → Generate packed extension)
- [ ] 提交审核（$5 one-time developer fee required）
- [ ] 设置定价策略: free + in-extension upgrade for premium features

### 2. 付费订阅后端
- [ ] 集成 Stripe Payment Links 或 Gumroad 作为支付网关
- [ ] 实现"解锁高级功能"的逻辑 (daily limit 提升到 500+)
- [ ] 在 popup 中显示升级提示（当用户接近 daily limit 时）
- [ ] 支持试用: 注册用户获得免费 AI credits

### 3. 更多 AI 命令模板
- [ ] 电商场景: "优化产品描述为SEO友好", "生成亚马逊标题"
- [ ] 社交媒体: "改写为微博风格", "翻译成推特格式(280字符)"
- [ ] 代码场景: "解释这段代码", "添加注释", "重构为更简洁的写法"
- [ ] 邮件场景: "重写这封邮件", "翻译为正式商务英语"

## 🟡 Medium Priority (近期迭代)

### 4. 版本同步 — v1.3
- [x] **manifest.json 版本号滞后**: 当前代码已 v1.2，manifest 仍显示 1.1.0 → **待更新为 1.2.0**
- [ ] content-script.js 有未提交的本地修改（需确认是否合入）
- [ ] CHANGELOG.md 与 TODO.md 需保持同步
- [ ] README 中英双语翻译待审核更新

### 5. 批量编辑模式
- [ ] 支持同时选中多个元素
- [ ] 对选中的所有元素应用相同 AI 指令
- [ ] 实时预览所有修改效果，一键全部确认/回退

### 6. 协作与分享
- [ ] 生成"编辑快照"链接（保存当前页面+AI修改后的对比）
- [ ] 导出为完整 HTML 文件（保留所有 AI 修改）
- [ ] 团队共享 prompt 模板库

### 7. 浏览器增强
- [ ] Favicon 自定义 — 根据页面主题自动调整 ✦ 按钮颜色
- [x] contextMenus permission 已声明，需确认右键菜单功能是否已实现（待验证）
- [ ] Side panel 支持 (Chrome side panel API)

## 🟢 Nice to Have

### 8. AI Providers 扩展
- [ ] Google Gemini / Claude / Llama 原生支持
- [ ] 内置轻量模型（通过 WebAssembly 本地运行）— 完全离线可用
- [x] Together AI 兼容接口已支持 (manifest CSP 已配置)
- [ ] 多个 provider 同时配置，智能选择最快/最便宜的

### 9. Analytics & Feedback
- [ ] 集成简单的使用统计（用户可关闭）
- [ ] 内置反馈按钮 — "报告问题" / "建议功能"
- [ ] A/B 测试不同 prompt 模板的效果

### 10. Monetization Features
- [ ] Freemium: 每天 N 次免费 AI 调用，付费解锁无限
- [x] Usage limits 已在 v1.1 实现（待配置阈值）
- [ ] One-time unlock: $9.99 买断高级功能
- [ ] Affiliate mode: 电商页面自动推荐优化服务（赚佣金）
- [ ] White-label: 卖给 Web 设计公司做定制版

### 11. Performance & Polish
- [ ] CSS animations use `transform` only (GPU accelerated)
- [ ] Debounce hover highlights for better performance on large pages
- [ ] Service worker caching for repeated API calls
- [ ] Memory leak check: cleanup when navigating to new page

## 🐛 Known Issues

### 1. Content script 在 Shadow DOM 页面中不生效
- 需要 additional `@import` or content script injection into shadow roots

### 2. HTTPS-only pages 的 API call 可能被 CORS 拦截
- 需要确保 CSP 包含所有可能的 API endpoints

### 3. Popup HTML 中的版本号硬编码
- 应该从 manifest.json 动态读取 (已部分实现)

---

## 📊 版本快照 (2026-05-30)

| 项目 | 状态 |
|------|------|
| 当前版本 | v1.2 (manifest 仍为 1.1.0, 需更新) |
| Quick Commands | 20 个 (含本地 fallback) |
| API 支持 | OpenAI compatible + Together AI |
| Undo/Redo | ✅ v1.1 已实现 |
| Export | ✅ v1.1 已实现 |
| Theme Toggle | ✅ v1.1 已实现 |
| Usage Limits | ✅ v1.1 已实现 |
| 文件数量 | ~20 个源文件 |
| Git Commits | 5 次 (初始 → v1.1 rewrite → docs → v1.2) |
| 未提交变更 | `content-script.js` 有本地修改待确认 |
