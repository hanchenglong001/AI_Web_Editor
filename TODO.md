# TODO — AI Web Editor Chrome Extension

## 🔴 High Priority (马上做)

### 0. 🚨 v1.5 — 目录结构清理 + CSP 修复 (立即修复，阻塞 CWS 发布)
- [ ] **合并重复文件** — 根目录 `background.js` vs `background/background.js`、`content.css` vs `content/content.css`、`content-script.js` vs `content/content.js`、`popup.html/js` vs `popup/popup.html/js` 内容不一致，manifest.json 引用的是 flat 版本但 subdirectory 版本也有更新
- [ ] **统一为一种目录结构** — 推荐保留 flat 结构（当前 manifest.json 引用的），删除 background/ content/ popup/ content-script/ 四个冗余子目录
- [ ] **删除无用文件** — `frist.txt` (0字节空文件)
- [ ] **CSP connect-src 补全** — manifest.json 的 CSP 缺少 Ollama (`http://localhost:11434`)、Azure endpoint，需改为动态注入或包含这些 URL
- [ ] **版本号硬编码** — popup.html 中 `v1.0.0` 写死，应从 manifest.json 动态读取

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

### 12. 🆕 CSP 动态注入方案 (v1.5 — 替代硬编码 fix)
- [ ] 不直接写入 `http://localhost:11434`，改为读取用户配置的 API base URL 动态更新 CSP
- [ ] manifest.json 的 `content_security_policy.extension_pages` connect-src 支持通配符或脚本注入
- [ ] 考虑使用 `script-src 'unsafe-inline'` + service worker 运行时添加 header 的方案

### 13. 🆕 Popup UI 优化 — 版本号动态读取
- [ ] popup.js 中从 `chrome.runtime.getManifest().version` 读取版本号替换硬编码
- [ ] popup.html 中的 `v1.0.0` → `<span id="version-display"></span>` 已由新代码支持

### 14. 🆕 v1.6 — AI 对话式编辑模式 (Conversation Mode)
- [ ] 当前面板是单轮指令交互，改为多轮对话（像 ChatGPT 一样持续 refine）
- [ ] 用户可追问/调整 AI 输出再自动应用（"更短一点"、"换个语气"）
- [ ] 保持 AI 聊天上下文，不需要重新选择元素

### 15. 🆕 安全沙箱 — AI 修改预览模式 (Diff Preview)
- [ ] AI 返回的结果先展示在侧边 diff 面板中
- [ ] 高亮变更行，一键 acceptance/reject（类似 GitHub PR review）
- [ ] 防止 AI 注入恶意 HTML/JS

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

## 📊 版本快照 (2026-05-30 T+8 — Cron Check)

|| 项目 | 状态 ||------|------|| 当前版本 | **v1.4.0** ✅ (待 v1.5 修复) || Flat files latest | ✅ 最新（background.js 17KB, content.css 8KB, content-script.js 47KB, popup.html 7KB, popup.js 5KB） || Subdirectory copies | ⚠️ Stale — 4 个冗余子目录共 ~39KB，内容全部落后根文件 7~25KB (background: 12KB, content: 0.4KB, content-script: 25KB, popup: 3KB) || frist.txt | 🗑️ 0 字节空文件，待删除 || Working Tree | 仅 TODO.md modified — 无其他未提交变更 || Git ahead of origin | ⚠️ **8 commits ahead of origin/master**（最新: docs: cron check T+4） — 连续第 8 次 cron check 仍领先，尚未 push || Quick Commands | 20+ 个（含 emoji fallback） || API 支持 | OpenAI compatible + Together AI + Ollama + Azure（CSP 缺少 localhost:11434） || Undo/Redo | ✅ v1.1 || Export (HTML/CSS/Full Page) | ✅ v1.1/v1.4 || Theme Toggle | ✅ v1.1 || Usage Limits | ✅ v1.1, 可配置 || Context Menu | ✅ v1.4 — rich submenu with element detection || Batch Edit (Multi-Select) | ✅ v1.3 — Shift+Click + Apply to All + index badge || Git Commits | ~13 次（本地）/ 5 次（远程） || CSP | ⚠️ connect-src 仅含 OpenAI + Together，缺 Ollama(localhost:11434)/Azure/LM Studio/vLLM — 需改为通配符方案
|------|------|
| 当前版本 | **v1.4.0** ✅ (待 v1.5 修复) |
| Flat files latest | ✅ 最新（content-script.js 47KB, background.js 17KB, popup.js 5KB — 含全部 v1.1~v1.4 功能） |
| Subdirectory copies | ⚠️ Stale — 4 个冗余子目录共 ~42KB，内容全部落后根文件 10~25KB |
| frist.txt | 🗑️ 0 字节空文件，待删除 |
| Working Tree | ⚠️ 1 modified (this TODO.md) — 无其他未提交变更 |
| Git ahead of origin | ⚠️ **8 commits ahead of origin/master**（最新: docs: cron check T+4） — 连续第 7 次 cron check 仍领先，尚未 push |
| Quick Commands | 20+ 个（含 emoji fallback） |
| API 支持 | OpenAI compatible + Together AI + Ollama + Azure（CSP 缺少 localhost:11434） |
| Undo/Redo | ✅ v1.1 |
| Export (HTML/CSS/Full Page) | ✅ v1.1/v1.4 |
| Theme Toggle | ✅ v1.1 |
| Usage Limits | ✅ v1.1, 可配置 |
| Context Menu | ✅ v1.4 — rich submenu with element detection |
| Batch Edit (Multi-Select) | ✅ v1.3 — Shift+Click + Apply to All + index badge |
| Git Commits | ~13 次（本地）/ 5 次（远程） |
| CSP | ⚠️ connect-src 仅含 OpenAI + Together，缺 Ollama(localhost:11434)/Azure/LM Studio/vLLM — 需改为通配符方案 |

---

## 📈 迭代方向评估 (2026-05-30 Cron Check T+8)

**项目整体状态**: v1.4.0 功能已收敛，working tree 干净（仅 TODO.md 修改）。距上次 cron check **仍无代码变更** — 这已是连续第 8 次 cron check 没有新代码提交。**关键问题：本地比远程领先 8 个 commit（全部是 docs/TODO/CHANGELOG 更新），尚未 push 到远端**。自 v1.4 发布以来进入"修 bug + 准备发布"阶段。

**建议立即行动**:
- **v1.5 修复应优先于更多功能迭代** — 目录冗余 + CSP 是两个阻塞 CWS 发布的硬伤，不应继续堆积 TODO
- **8 个本地文档 commits 应先 push** — 保持远程状态同步
- **考虑发布 v1.4.1 小版本**（含文档更新）作为正式发行，v1.5 单独走发布流程

### 🔴 P0 — 发布前必须修复 (阻塞 CWS 审核)
1. **目录结构清理 (v1.5)** — 4 个冗余子目录共 ~39KB: background/ (12KB落后), content/ (0.4KB落后), content-script/ (25KB落后), popup/ (3KB落后) + frist.txt。统一 flat 结构，删除子目录。预计耗时：~30min
2. **CSP connect-src 补全** — manifest.json CSP 缺少 Ollama/Azure/LM Studio/vLLM。**方案**: 改为 `connect-src 'self' https: http:`（CWS 可接受）
3. **版本号动态读取** — popup.js 已有代码支持，popup.html 待改 `<span id="version-display">`
4. **Push 8 个本地 commits 到远端**

### 🟡 P1 — 下一步功能迭代 (5个优先级)
1. **AI 对话式编辑模式 (Conversation Mode, v1.6)** — 多轮对话，支持追问/调整 AI 输出。用户留存差异点
2. **安全沙箱 Diff Preview** — AI 修改先展示 diff，高亮变更行后 acceptance/reject（类似 GitHub PR review）
3. **Chrome Web Store 发布流程** — SVG→PNG 图标、listing 截图、banner、打包 ZIP、提交审核($5 fee)
4. **付费订阅集成 (Freemium)** — Stripe Payment Links + premium unlock（daily limit → 无限）
5. **用户自定义 Prompt 模板库** — chrome.storage 保存/编辑/分享自己的快捷命令

### 🟢 P2 — 持续优化
- i18n 多语言界面 (EN/CN/JA)、Gemini/Claude provider 扩展、Performance 优化、Side Panel API 集成、记忆上次 tab 上下文

---
