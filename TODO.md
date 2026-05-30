# AI Web Editor — TODO / Roadmap

## ✅ Completed

| Version | Features | Status |
|---------|----------|--------|
| v1.0 | Basic AI element editing, commands | ✅ |
| v1.1 | Undo/redo, HTML editor, theme toggle, FAB | ✅ |
| v1.2 | Model selector (Qwen/Gemini/GPT), token tracking | ✅ |
| v1.3 | Batch edit mode, custom CSS rules, code highlight | ✅ |
| v1.4 | Context menu submenu, full page HTML export | ✅ |
| v1.5 | Flat→src/ refactor, CSP fix, dynamic version | ✅ |
| v1.6 | Diff Preview, Element History, Translate Overlay, CSS Rules Panel | ✅ |
| v1.7 | Review Mode, Snippet Library, Auto-Detect Language, Code Highlight Editor | ✅ |
| v1.8 | Element Inspector tab (DOM tree + Computed Style) | ✅ |
| v1.9 | Quick Commands palette, Multi-lang Translate, Theme Editor, Keyboard Shortcuts + Global Hotkey | ✅ |
| v2.0 | Chrome Web Store release prep (privacy policy, LICENSE, README, CHANGELOG, CSP update) | ✅ |

---

## 🎯 Planned — v2.1

### Must-have for CWS approval
- [ ] **Permissions justification** — Add `tabs` permission manifest entry if not present
- [ ] **Icon optimization** — Generate proper Web Store icons (128px, 48px, 32px) via PNG optimization tools
- [ ] **Screenshot quality review** — Verify 5 screenshots meet CWS requirements (1280x800 recommended)

### User-facing features
- [ ] **Snippet Library UI** — Dedicated snippet management panel in popup with CRUD operations
- [ ] **Export/Import settings** — Backup/restore user preferences as JSON file
- [ ] **Batch mode improvements** — Bulk edit across multiple matching elements with preview
- [ ] **Custom CSS Presets** — 10+ CSS effect presets (blur, grayscale, contrast, sepia, etc.)

### Technical improvements
- [ ] **Content script performance** — Profile and optimize content.js loading time
- [ ] **Memory leak fix** — Review event listener cleanup in content scripts
- [ ] **Service Worker optimization** — Background worker message handling reliability
- [ ] **Error boundaries** — Graceful degradation when AI API fails

---

## 🚀 Future — v2.x+

### Major features
- [ ] **AI Image generation/editing** — Generate or modify images directly in-page via AI
- [ ] **Web page screenshot export** — Save modified page as HTML/PNG with all changes applied
- [ ] **Multi-tab editing** — Apply same edit across multiple open tabs simultaneously
- [ ] **AI-powered form filling** — Auto-fill forms using AI understanding of context
- [ ] **Accessibility auditing** — Detect and suggest accessibility improvements (WCAG)

### Integrations
- [ ] **GitHub/VSCode sync** — Sync snippets and themes to GitHub/GitLab
- [ ] **Browser profile support** — Different AI settings per browser profile
- [ ] **Collaborative editing** — Share editor state with team members in real-time

---

## 📦 Release Checklist (CWS)

- [ ] Review all 5 screenshots meet CWS quality standards
- [ ] Update `privacy-policy_url` in manifest
- [ ] Prepare store listing:
  - [ ] Full description (~4000 chars)
  - [ ] Short description (~132 chars)  
  - [ ] Screenshots (desktop + mobile if applicable)
  - [ ] Feature graphic (1400x560)
  - [ ] Promotional video (optional)
- [ ] Submit for review
- [ ] Monitor CWS feedback and iterate

---

## 🐛 Bug Fixes / Issues

*(Add discovered issues here with reproduction steps)*

---

## 📊 版本快照 (2026-05-30 T+22 — Cron Check #8)

| 项目 | 状态 |
|------|------|
| **当前版本** | **v2.0.0** ✅ (CWS Release Prep Complete) |
| **Git sync** | ✅ Working tree clean — HEAD=dffdedb (merged with origin/master) |
| **Last commit** | dffdedb — `Merge: resolve TODO.md conflict` |
| **Latest release** | 15396b1 — `release(v2.0.1): CWS screenshots + .gitignore fix + roadmap` |
| **v2.0 release** | 9b295ce — privacy-policy.html, LICENSE (MIT), CHANGELOG complete, CSP dashscope |
| **CHANGELOG.md** | ✅ v1.0-v1.9 fully documented (124 lines) |
| **Directory Structure** | ✅ clean `src/` tree + docs/assets in root |
| **CSP** | ✅ OpenAI + Together + Gemini + localhost + 127.0.0.1 + dashscope.aliyuncs.com |
| **Manifest V3** | ✅ Version 2.0.0, permissions: activeTab, storage, contextMenus, scripting |
| **CWS Assets** | ✅ privacy-policy.html, LICENSE, .cws-publish-manifest.json, screenshots/ (5 images) |
| **Quick Commands** | 27+ (General / Translation 5-lang / Length / Specialized + Quick Commands palette) |

## 🔍 T+22 Cron Check Findings (2026-05-30)

1. **Project has reached v2.0.0 CWS release stage** — all publishing prerequisites met: privacy policy, LICENSE, CHANGELOG complete, screenshots generated, CSP updated for dashscope
2. **CHANGELOG.md is now complete** — all versions from v1.0 to v1.9 documented (was missing since T+6)
3. **TODO.md was refreshed by remote v2.0.1 commit** — includes CWS checklist and v2.1 roadmap, replaced local cron snapshot version
4. **manifest.json CSP now includes dashscope.aliyuncs.com** — Alibaba Cloud AI provider support added for international users
5. **.cws-publish-manifest.json created** — contains Chrome Web Store metadata (upload file for CWS dashboard)
6. **No new uncommitted changes** — working tree clean after merging remote TODO.md
7. **Recommendation**: Next milestone is v2.1 implementation from the roadmap (Snippet Library UI, settings export/import, performance optimizations), then submit to Chrome Web Store

## 🗺️ 下一步建议 (T+22)

按优先级排序：

1. **🔴 CWS Submission** — 虽然所有资产已就绪，但尚未实际提交到 Chrome Web Store。$5 开发者费用需支付后才能发布。
2. **🟡 v2.1 Implementation** — 按 TODO.md 规划，优先实现: (a) Snippet Library UI, (b) Export/Import settings, (c) Content script performance profiling
3. **🟢 代码模块化重构** — content.js 规模持续增长（~4000+行），v2.x+ 前应启动模块化拆分
4. **🟢 AI Conversation Mode** (本地 T+6 开发但远程未合并) — 多轮对话功能在本地已实现但远端仍为 v1.9，需决定是否合并到主分支

---

## 💰 商业化路线图

| Phase | 功能 | 预计时间线 |
|-------|------|------------|
| Phase 1 (MVP) | CWS free listing + Stripe Payment Links + daily limit upgrade | Month 1-2 |
| Phase 2 | Freemium tier (10 free / unlimited paid $4.99/mo) + trial credits | Month 3 |
| Phase 3 | Team features ($9.99/mo): shared prompt library, batch export | Month 4-5 |
| Phase 4 | White-label for agencies | Month 6+ |