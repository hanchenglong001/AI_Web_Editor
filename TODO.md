# TODO — AI Web Editor Chrome Extension

## 🔴 High Priority (马上做)

### 0. ✅ v1.5 — 目录结构清理 + CSP 修复 (已完成)
- [x] **合并重复文件** — flat files → `src/` 子目录（manifest.json 引用 `src/background/`, `src/content/`, `src/content-script/`, `src/popup/`）
- [x] **统一为 src/ 结构** — 所有源文件已迁移到 `src/`，根目录旧 flat 文件已删除
- [x] **删除无用文件** — `frist.txt` ✅、`test-report.md` ✅、空子目录 ✅
- [x] **CSP connect-src 补全** — 已添加 `http://localhost:*`、`http://127.0.0.1:*`、`https://generativelanguage.googleapis.com`
- [x] **.gitignore** — 已添加 test-content.py, icons generated files

### 1. ✅ v1.5 Manifest Version Bump (已完成)
- [x] manifest.json 版本号从 `1.4.0` → `1.5.0`（reflect refactor 变更）
- [x] TODO.md 版本快照同步更新为 v1.5

### 2. Chrome Web Store 发布流程
- [ ] 创建完整的扩展图标（SVG → PNG 多尺寸, 48x48/128x128 高清）
- [ ] 编写 Web Store listing: 描述、截图、宣传图 (1400x560 banner)
- [ ] 生成打包 ZIP (`chrome://extensions/` → Developer mode → Generate packed extension)
- [ ] 提交审核（$5 one-time developer fee required）
- [ ] 设置定价策略: free + in-extension upgrade for premium features

### 3. 付费订阅 / 后端服务
- [ ] 集成 Stripe Payment Links 或 Gumroad 作为支付网关
- [ ] 实现"解锁高级功能"的逻辑 (daily limit 提升到 500+)
- [ ] 在 popup 中显示升级提示（当用户接近 daily limit 时）
- [ ] 支持试用: 注册用户获得免费 AI credits

### 4. AI 命令模板 & Prompt Library
- [x] ~~电商场景~~ ✅ v1.2 (product-desc, tweet-style, weibo-style)
- [x] ~~社交媒体~~ ✅ Already included
- [x] ~~代码场景~~ ✅ Explain-code, add-comments
- [x] ~~邮件场景~~ ✅ Professional-email, fix-grammar
- [ ] 新增: Markdown 转纯文本 / JSON → 表格 / 语音转写整理
- [ ] 新增: SEO meta description 生成、OG tags 优化
- [ ] 自定义 prompt 模板 — 用户可保存/编辑自己的快捷命令 (v1.7 Snippet Library 基础已就绪，需升级为 Prompt Library)

## 🟡 Medium Priority (近期迭代)

### 5. 协作与分享
- [x] **上下文菜单右键编辑** — contextMenus API (Edit with AI / Translate CN/EN / Shorten / Open Panel)
- [x] **导出为完整 HTML 文件** — 📄 按钮保留所有 AI 修改
- [ ] 生成"编辑快照"链接 (保存当前页面+AI修改后的对比)
- [ ] 团队共享 prompt 模板库
- [ ] 导出为 Markdown / JSON 格式

### 6. ✅ v1.5 — 版本号动态读取 (已完成)
- [x] popup.js 中从 `chrome.runtime.getManifest().version` 读取版本号替换硬编码

### 7. 浏览器增强
- [ ] Favicon 自定义 — 根据页面主题自动调整 ✦ 按钮颜色
- [ ] Side panel 支持 (Chrome side panel API, for complex edits)
- [ ] Tab-aware: 记住上次编辑的 tab，跨 tab 恢复上下文
- [ ] 右键菜单元素选择后，面板可折叠为非模态浮窗

### 8. AI Providers 扩展
- [ ] Google Gemini / Claude / Llama 原生支持 (已在 manifest CSP 中预留)
- [ ] 内置轻量模型（通过 WebAssembly 本地运行）— 完全离线可用
- [x] Together AI 兼容接口已支持
- [ ] 多个 provider 同时配置，智能选择最快/最便宜的

### 9. ✅ v1.6 — Diff Preview + Element History (已完成)
- [x] **Diff Preview** — LCS-based word/line diff 算法，AI 输出先展示红绿差异再确认应用
- [x] **Element Selector History** — 记住最近 10 个选中元素，支持 CSS selector 重建与恢复
- [x] **Quick Translate Overlay** — 页面文本选择后浮出翻译气泡（10 语言）
- [x] **Custom CSS Rules Panel** — 保存/删除/编辑自定义 CSS 选择器+样式

### 10. ✅ v1.7 — Review Mode + Snippet Library + Auto Detect (已完成)
- [x] **Review Mode** — AI 修改进入待审队列，用户逐个 accept/reject（类 GitHub PR review）
- [x] **Snippet Library** — 保存/删除/搜索可复用文本片段，📎 按钮插入到命令输入框
- [x] **Auto-Detect Language** — Unicode + keyword 检测 8 种语言，推荐翻译目标，语言指示器徽章
- [x] **Code Highlight Editor** — HTML Tab 语法高亮覆盖（标签/属性/注释着色），可折叠代码块

### 11. ✅ v1.8 — Element Inspector tab (已完成)
- [x] **Inspector tab** — DOM 树展示，tag/class/id 高亮，50 节点截断
- [x] **Computed Style view** — 按 Layout / Box Model / Typography / Background / Border 分组
- [x] **CSS selector 生成** — tag > class.id 模式，可复制并导航到对应元素

### 12. ✅ v1.9 — AI Conversation Mode (已完成)
- [x] **多轮对话** — 从单轮指令改为持续聊天（像 ChatGPT 一样 refine）
- [x] **用户追问/调整** — "更短一点"、"换个语气"，自动应用新结果
- [x] **上下文保持** — AI 聊天历史持久化在 chrome.storage，不需要重新选择元素
- [x] **对话气泡 UI** — 输入框支持 Enter 发送，Shift+Enter 换行
- [x] **消息列表** — 用户/AI 消息时间线展示，可滚动查看

### 13. Content.js 代码质量 — 需重构 ⚠️
- [ ] content.js 当前 ~4,000+ 行，亟需模块化拆分
- [ ] 拆分模块（选择器逻辑、面板渲染、AI 调用、Diff/Review/Inspector/Conversation 独立文件）
- [ ] 添加 JSDoc 注释覆盖核心函数
- [ ] 单元测试框架（建议使用 Playwright E2E / Chrome Extension Test Framework）

## 🟢 Nice to Have

### 14. Analytics & Feedback
- [ ] 集成简单的使用统计 (用户可关闭)
- [ ] 内置反馈按钮 — "报告问题" / "建议功能"
- [ ] A/B 测试不同 prompt 模板的效果

### 15. Monetization Features
- [x] Usage limits 已在 v1.1 实现
- [ ] Freemium: 每天 N 次免费 AI 调用，付费解锁无限
- [ ] One-time unlock: $9.99 买断高级功能
- [ ] Affiliate mode: 电商页面自动推荐优化服务 (赚佣金)
- [ ] White-label: 卖给 Web 设计公司做定制版

### 16. Performance & Polish
- [ ] CSS animations use `transform` only (GPU accelerated)
- [ ] Debounce hover highlights for better performance on large pages
- [ ] Service worker caching for repeated API calls
- [ ] Memory leak check: cleanup when navigating to new page
- [ ] 页面中大量 DOM 元素时优化选择性能

### 17. 多语言 / 国际化 (i18n)
- [ ] popup 和面板 UI 支持英文/中文/日文切换
- [ ] prompt 模板的本地化翻译包

### 18. 🆕 Element Inspector UX 改进
- [ ] 添加搜索框用于快速查找页面元素（支持 CSS selector / text content）
- [ ] 多选结果列表，带缩进层级展示 DOM 结构
- [ ] 快捷键支持: ESC 取消选择、Enter 确认

### 19. 模板系统升级 — 用户自定义 Prompt Library (chrome.storage)
- [ ] 在 popup 中新增"我的模板"tab，可创建/编辑/删除自定义 prompt
- [ ] 支持变量占位符（如 `{{selection}}`、`{{page_url}}`）
- [ ] 模板分类: 通用 / 电商 / 代码 / 邮件 / 社交
- [ ] 导入/导出模板包 (JSON 格式)

### 20. Smart Batch — CSS Selector 批量操作
- [ ] 基于 CSS selector 的批量操作（"所有 h2 标题翻译成中文"）
- [ ] 批量修改预览: 同时显示所有元素的 AI 结果再统一应用
- [ ] 增量/覆盖模式切换

### 21. Docs & Community
- [x] ~~CHANGELOG.md v1.0-v1.5~~ ✅ — **v1.6-v1.9 CHANGELOG 条目需补充** (see #22)
- [ ] CHANGELOG.md — 更新 v1.6/v1.7/v1.8/v1.9 版本记录
- [ ] CONTRIBUTING.md — 开发者指南
- [ ] 添加示例 GIF/demo 视频到 README
- [ ] 创建 GitHub Discussions / Discord 社区

## 🐛 Known Issues

### 1. Content script 在 Shadow DOM 页面中不生效
- 需要 additional `@import` or content script injection into shadow roots

### 2. HTTPS-only pages 的 API call 可能被 CORS 拦截
- 需要确保 CSP 包含所有可能的 API endpoints

### 3. 🆕 content.js 代码规模膨胀 (v1.8-v1.9)
- 当前 total ~7,000+ 行代码（content.js: ~4,000+ / content.css: 1,626 / popup.js: 575 / background.js: 385）
- v1.7 一次性提交了 +1,956 行，v1.9 Conversation Mode 又增加了大量代码
- **风险**: 代码可维护性下降、加载性能开销、新开发者上手困难
- **建议**: 在 v2.0 规划中引入模块化拆分

### 4. 🆕 CHANGELOG.md 版本记录不完整
- 当前只记录了 v1.0-v1.5，v1.6-v1.9 的所有功能变更均未写入 CHANGELOG
- **紧急度**: HIGH — 发布前必须补全

---

## 📊 版本快照 (2026-05-30 T+21 — Cron Check #7)

| 项目 | 状态 |
|------|------|
| **当前版本** | **v1.9.0** ✅ (AI Conversation Mode) |
| **Git sync** | ⚠️ TODO.md has uncommitted changes (about to commit/push) |
| **Last commit** | 1a349f0 — `docs: cron check T+20` |
| **Latest feat** | dd0e7bd — `feat(v1.8): Element Inspector tab` |
| **v1.6 feat** | e34e4e9 — `Diff Preview, Element History, Translate Overlay, CSS Rules Panel` |
| **CHANGELOG.md** | ⚠️ v1.0-v1.5 documented, **v1.6-v1.9 entries MISSING** (needs update) |
| **Directory Structure** | ✅ clean `src/` tree |
| **CSP** | ✅ OpenAI + Together + Gemini + localhost + 127.0.0.1 |
| **Code Size** | 📏 ~7,000+ total lines (content.js: ~4,000+ / content.css: 1,626 / popup.js: 575 / background.js: 385) |
| **Manifest V3** | ✅ Permissions: activeTab, storage, contextMenus, scripting |
| **Quick Commands** | 20+ (General / Translation 5-lang / Length / Specialized) |
| **Conversation Mode** | ✅ v1.9 multi-turn AI chat with persistent history |

## 🔍 T+21 Cron Check Findings (2026-05-30)

1. **Git working tree has uncommitted TODO.md changes** — previous cron check T+20's diff is waiting to be committed
2. **CHANGELOG.md still missing v1.6-v1.9 entries** — despite 4 feature releases since v1.5
3. **content.js has grown from 3,522 to ~4,000+ lines** — v1.9 Conversation Mode added significant code; modularization is now critical
4. **Total project size now ~7,000+ lines** — approaching threshold where maintenance becomes difficult
5. **Project has reached feature-rich MVP stage** — next milestones should focus on: (a) CHANGELOG completeness, (b) CWS publishing prep, (c) code refactoring for v2.0
6. **v1.9 Conversation Mode is a major UX improvement** — transforms the extension from single-turn commands to ongoing AI conversation
7. **Recommendation**: Commit/push current changes, update CHANGELOG with v1.6-v1.9 entries, then prioritize CWS publishing and content.js modularization for v2.0

---

## 💰 商业化路线图

| Phase | 功能 | 预计时间线 |
|-------|------|------------|
| Phase 1 (MVP) | CWS free listing + Stripe Payment Links + daily limit upgrade | Month 1-2 |
| Phase 2 | Freemium tier (10 free / unlimited paid $4.99/mo) + trial credits | Month 3 |
| Phase 3 | Team features ($9.99/mo): shared prompt library, batch export | Month 4-5 |
| Phase 4 | White-label for agencies | Month 6+ |
