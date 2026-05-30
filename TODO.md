# TODO — AI Web Editor Chrome Extension

## 🔴 High Priority (马上做)

### 0. ✅ v1.5 — 目录结构清理 + CSP 修复 (已完成)
- [x] **合并重复文件** — flat files (`background.js`, `content.css`, `content-script.js`, `popup.html/js`) → `src/` 子目录（manifest.json 引用 `src/background/`, `src/content/`, `src/content-script/`, `src/popup/`）
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

### 4. 更多 AI 命令模板
- [x] ~~电商场景~~ ✅ Added in v1.2 (product-desc, tweet-style, weibo-style)
- [x] ~~社交媒体~~ ✅ Already included
- [x] ~~代码场景~~ ✅ Added explain-code, add-comments
- [x] ~~邮件场景~~ ✅ Added professional-email, fix-grammar
- [ ] 新增: Markdown 转纯文本 / JSON → 表格 / 语音转写整理
- [ ] 新增: SEO meta description 生成、OG tags 优化
- [ ] 自定义 prompt 模板 — 用户可保存/编辑自己的快捷命令

## 🟡 Medium Priority (近期迭代)

### 5. 协作与分享
- [x] **上下文菜单右键编辑** — contextMenus API 已实现 (Edit with AI / Translate CN / Translate EN / Shorten / Open Panel)
- [x] **导出为完整 HTML 文件** — 📄 按钮保留所有 AI 修改
- [ ] 生成"编辑快照"链接 (保存当前页面+AI修改后的对比)
- [ ] 团队共享 prompt 模板库
- [ ] 导出为 Markdown / JSON 格式

### 6. ✅ v1.5 — 版本号动态读取 (已完成)
- [x] popup.js 中从 `chrome.runtime.getManifest().version` 读取版本号替换硬编码
- [x] popup.html 中的 `<span id="version-display"></span>` 已由新代码支持

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

## 🟢 Nice to Have

### 9. Analytics & Feedback
- [ ] 集成简单的使用统计 (用户可关闭)
- [ ] 内置反馈按钮 — "报告问题" / "建议功能"
- [ ] A/B 测试不同 prompt 模板的效果

### 10. Monetization Features
- [x] Usage limits 已在 v1.1 实现
- [ ] Freemium: 每天 N 次免费 AI 调用，付费解锁无限
- [ ] One-time unlock: $9.99 买断高级功能
- [ ] Affiliate mode: 电商页面自动推荐优化服务 (赚佣金)
- [ ] White-label: 卖给 Web 设计公司做定制版

### 11. Performance & Polish
- [ ] CSS animations use `transform` only (GPU accelerated)
- [ ] Debounce hover highlights for better performance on large pages
- [ ] Service worker caching for repeated API calls
- [ ] Memory leak check: cleanup when navigating to new page
- [ ] 页面中大量 DOM 元素时优化选择性能

### 12. 多语言 / 国际化 (i18n)
- [ ] popup 和面板 UI 支持英文/中文/日文切换
- [ ] prompt 模板的本地化翻译包

### 13. ✅ CSP 修复 (v1.5 DONE)
- [x] CSP connect-src 已扩展: `http://localhost:*`、`http://127.0.0.1:*`（覆盖 Ollama、LM Studio）+ `https://generativelanguage.googleapis.com`（Gemini）
- [ ] 未来如需支持 vLLM / Azure / 动态用户 endpoint，考虑改为 MV3 中 CSP 通配符方案

### 14. 🆕 v1.6 — AI 对话式编辑模式 (Conversation Mode)
- [ ] 当前面板是单轮指令交互，改为多轮对话（像 ChatGPT 一样持续 refine）
- [ ] 用户可追问/调整 AI 输出再自动应用（"更短一点"、"换个语气"）
- [ ] 保持 AI 聊天上下文，不需要重新选择元素

### 15. 🆕 安全沙箱 — AI 修改预览模式 (Diff Preview)
- [ ] AI 返回的结果先展示在侧边 diff 面板中
- [ ] 高亮变更行，一键 acceptance/reject（类似 GitHub PR review）
- [ ] 防止 AI 注入恶意 HTML/JS

## 🆕 v1.6+ 新增 — 近期迭代方向评估 (2026-05-30 T+17 Cron Check)

### 16. Element Inspector UX 改进
- [ ] 添加搜索框用于快速查找页面元素（支持 CSS selector / text content）
- [ ] 多选结果列表，带缩进层级展示 DOM 结构
- [ ] 快捷键支持: ESC 取消选择、Enter 确认

### 17. 模板系统升级 — 用户自定义 Prompt Library (chrome.storage)
- [ ] 在 popup 中新增"我的模板"tab，可创建/编辑/删除自定义 prompt
- [ ] 支持变量占位符（如 `{{selection}}`、`{{page_url}}`）
- [ ] 模板分类: 通用 / 电商 / 代码 / 邮件 / 社交
- [ ] 导入/导出模板包 (JSON 格式)

### 18. 批量编辑增强 — Smart Batch
- [ ] 基于 CSS selector 的批量操作（"所有 h2 标题翻译成中文"）
- [ ] 批量修改预览: 同时显示所有元素的 AI 结果再统一应用
- [ ] 增量/覆盖模式切换

### 19. Content.js 代码质量 — 1,214 行需要关注
- [ ] 当前 content.js 已 1,214 行，考虑拆分模块（选择器逻辑、面板渲染、AI 调用独立文件）
- [ ] 添加 JSDoc 注释覆盖核心函数
- [ ] 单元测试框架（建议使用 Chrome Extension Test Framework / Playwright）

### 20. Docs & Community
- [ ] CHANGELOG.md 更新 — 目前仅有早期版本记录，v1.1-v1.5 变更未同步
- [ ] CONTRIBUTING.md — 开发者指南
- [ ] 添加示例 GIF/demo 视频到 README
- [ ] 创建 GitHub Discussions / Discord 社区

## 🐛 Known Issues

### 1. Content script 在 Shadow DOM 页面中不生效
- 需要 additional `@import` or content script injection into shadow roots

### 2. HTTPS-only pages 的 API call 可能被 CORS 拦截
- 需要确保 CSP 包含所有可能的 API endpoints

---

## 📊 版本快照 (2026-05-30 T+17 — Cron Check #2)

|| | 项目 | 状态 ||
|------|------|||
| **当前版本** | **v1.5.0** ✅ (refactor complete: flat → `src/`, version bump, dynamic version in popup) ||
| **Git sync** | ⚠️ Working tree dirty — TODO.md unstaged changes pending commit ||
| **Directory Structure** | ✅ v1.5 DONE — clean `src/` structure, old flat files deleted ||
| **CSP** | ✅ connect-src: OpenAI + Together + Gemini + localhost:* + 127.0.0.1:* ||
| **Quick Commands** | 20+ 个（含 emoji fallback） ||
| **API 支持** | OpenAI compatible + Together AI + Ollama + Azure/Gemini/Localhost ||
| **Undo/Redo** | ✅ v1.1 ||
| **Export (HTML/CSS/Full Page)** | ✅ v1.1/v1.4 ||
| **Theme Toggle** | ✅ v1.1 ||
| **Usage Limits** | ✅ v1.1, 可配置 ||
| **Context Menu** | ✅ v1.4 — rich submenu with element detection ||
| **Batch Edit (Multi-Select)** | ✅ v1.3 — Shift+Click + Apply to All + index badge ||
| **Code Size** | 📏 2,122 total code lines (content.js: 1,214 / content.css: 492 / background.js: 298) ||
| **Wiki Docs** | ✅ 已创建 — architecture, modules, workflows (docs/wiki/) ||

---

## 📈 迭代方向评估 (2026-05-30 T+20 — Cron Check #5)

**项目整体状态**: v1.5.0 已完成所有代码规范化和文档更新。CHANGELOG.md 已补充完整（v1.0-v1.5）。Git working tree clean，已与 origin/master 同步。**项目已进入产品发布准备阶段**。

**下一步关键动作**:
1. ✅ Git sync 已合并完成 — origin/master = HEAD (a4f88a0)
2. ✅ CHANGELOG.md 已更新完整（v1.0-v1.5）
3. **Chrome Web Store 发布流程启动** — 图标、截图、banner、描述文案撰写，打包 ZIP 提交审核
4. **v1.6 Conversation Mode** 规划与设计（多轮对话编辑面板）

**整体判断**: 核心功能已经非常成熟，下一步应从"功能迭代"转向"用户体验打磨 + 产品发布准备"。

### 🔴 P0 — v1.6 候选功能（开发优先）
1. **AI 对话式编辑模式 (Conversation Mode)** — 多轮 refine 对话面板，像 ChatGPT 一样持续改进内容，保持上下文不丢失。预计 ~2-3天
2. **安全沙箱 Diff Preview** — AI 修改 diff 预览 + acceptance/reject（类似 GitHub PR review），防止恶意注入。预计 ~1-2天

### 🟡 P1 — v1.5.1 发布准备（本周）
1. **Git sync 收尾** — commit TODO.md 变更，确保 origin/master 干净
2. **Chrome Web Store 发布全流程** — 完善图标设计、截图/banner 生成、描述文案撰写、打包 ZIP、提交审核。预计 ~1天

### 🟢 P2 — v1.6+ 持续优化路线图
1. Element Inspector UX 改进（搜索框、层级展示、快捷键）
2. 用户自定义 Prompt Library（chrome.storage，支持变量占位符、导入/导出）
3. Smart Batch — CSS selector 批量操作 + 批量预览
4. content.js 模块拆分 & JSDoc（1,214 行需重构）
5. CHANGELOG.md 更新 v1.1-v1.5 + CONTRIBUTING.md + Demo GIF

---

## 📊 版本快照 (2026-05-30 T+20 — Cron Check #5)

|||| | 项目 | 状态 ||
||------|------||||
|| **当前版本** | **v1.5.0** ✅ (stable, git clean, CHANGELOG updated) ||
|| **Git sync** | ✅ Working tree clean — HEAD=a4f88a0 (synced with origin/master) ||
|| **Last commit** | a4f88a0 — `docs: add v1.5.0 changelog entry` ||
|| **CHANGELOG.md** | ✅ Updated — v1.0-v1.5 all now documented ||
|| **Directory Structure** | ✅ clean `src/` tree ||
|| **CSP** | ✅ OpenAI + Together + Gemini + localhost + 127.0.0.1 ||
|| **Code Size** | 📏 content.js: 1,214 / content.css: 492 / background.js: 298 ≈ 2,122 lines total ||
|| **Manifest V3** | ✅ Permissions: activeTab, storage, contextMenus, scripting ||

## 🔍 T+20 Cron Check Findings (2026-05-30)

1. **Git working tree is CLEAN** — all changes committed and pushed to origin/master
2. **CHANGELOG.md v1.5.0 entry now added** — flat→src/ refactor, CSP fix, version bump fully documented
3. No code changes detected — project ready for CWS (Chrome Web Store) submission phase
4. Recommendation: focus on Chrome Web Store listing prep (icons, screenshots, description) and v1.6 Conversation Mode planning

## 💰 商业化路线图
  
| Phase | 功能 | 预计时间线 |
|-------|------|------------|
| Phase 1 (MVP) | CWS free listing + Stripe Payment Links + daily limit upgrade | Month 1-2 |
| Phase 2 | Freemium tier (10 free / unlimited paid $4.99/mo) + trial credits | Month 3 |
| Phase 3 | Team features ($9.99/mo): shared prompt library, batch export | Month 4-5 |
| Phase 4 | White-label for agencies | Month 6+ |
