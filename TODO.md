# AI Web Editor — Strategy + Development Roadmap

## 📐 产品战略方向（AI Agent 分析结论）

### ✅ 核心方向 — "做深不做广"

**当前问题**: v1.0~v2.0 堆了十几个功能，每个都做了但没一个做到极致。用户不需要更多按钮，需要更好的体验。

**正确策略**:
- **砍掉不常用的功能**（快捷键管理器、主题编辑器等）— 精简到核心 3-5 个功能
- **把 AI 编辑能力做深** — 这是唯一有护城河的地方
- **找到一个杀手级场景**，做到"卧槽这好用"而非十个"还行吧"

---

## 🔴 不建议做的（优先级最低）

这些方向会分散资源，阻碍核心竞争力的建立：

|| # | 功能 | 为什么不推荐 | 替代方案 |
|---|------|-------------|---------|
| ❌ 1 | **付费订阅后端** | 在核心产品没验证 PMF 之前做商业化太早 | 先免费积累用户，v3.0+ 再考虑 |
| ❌ 2 | **更多功能堆叠** (v2.0 已有十几个功能) | 工具箱合集 = 没有特色，用户记不住卖点 | 砍功能，做精品 |
| ❌ 3 | **继续堆模板/命令** (已有 27+ 命令) | 用户不知道怎么用，反而增加认知负担 | 精简为最常用的 5-8 个 |
| ❌ 4 | **跨浏览器支持** (Edge/Firefox/Safari) | 资源有限时应先做好 Chrome 扩展 | Chrome 验证 PMF 后再说 |
| ❌ 5 | **协作/团队编辑** | 偏离核心场景，开发成本极高 | 不考虑 |

---

## ✅ 建议做的（按优先级排序）

### P0 — 立即执行（砍功能 + CWS 发布）

1. **审查并删除低使用率功能模块**
   - 快捷键管理器 → 只保留 manifest.json 的 `chrome.commands`，删掉 popup UI
   - 主题编辑器 → 只保留 Light/Dark 切换按钮，删掉自定义色板/保存/管理面板
   - CSS Rules Panel（如果存在）→ 合并到 Quick Commands 里

2. **重构核心交互流程** — 当前点击"AI Web Editor"图标弹出 popup 再选功能，太慢
   - 改为：右键元素 → 直接出现 AI 编辑面板
   - 或者：选中文字后浮出 mini-toolbar（类似浏览器原生右键菜单的增强版）

3. **CWS 发布**
   - ✅ `privacy_policy_url` added + version bumped to v2.1.0 (resolved in cron T+27)
   - ⏳ 需要真实截图替换模拟截图
   - ⏳ Store listing description + feature graphic (1400×560) 未创建

### P1 — AI 编辑做深（核心竞争力，v2.1~v2.5）

4. **结构化页面理解**（护城河功能）
   - 不是盲目传整个 HTML 给 LLM，而是先用规则分析页面结构（导航、文章区、侧边栏、表格）
   - 识别元素语义：是按钮？标题？正文？图片描述？
   - 只对需要编辑的区域调用 AI API，降低成本 + 提高精度

5. **智能批量操作**（差异化场景）
   - 检测到全站 N 个同类元素 → 提示"发现 X 个相同样式的按钮，是否统一修改？"
   - 用户确认后一次性批量应用 AI 修改

6. **Diff Preview 升级为 Diff Tree**
   - 当前只对比文本差异 → 升级到 DOM 属性级（class、style、textContent、attributes）
   - 显示哪些 CSS 属性被改、哪些 HTML 标签变了、哪些新节点被添加

7. **翻译能力超越沉浸式翻译**
   - 增强：在页面元素上直接展示翻译结果（inline tooltip 非覆盖式）
   - 支持"解释性翻译" — 不仅翻译文字，还解释文化背景差异

### P2 — PMF 验证 + 杀手级场景（v2.5+）

8. **找到并深耕一个杀手级场景** — A: 信息抽取 / B: 无障碍改造 / C: 社交媒体内容生成
9. **缓存 + 离线能力** — 页面结构缓存，降低 API 成本
10. **Content script 性能优化** — profile、内存泄漏排查

---

## 🎯 Version Roadmap

### v2.1 — 精简 + CWS 发布 ✅ BLOCKER RESOLVED (v2.1.0, T+27)
- [x] Add `privacy_policy_url` to manifest.json + bump version → CWS blocker resolved
- [ ] Delete low-usage feature UI（快捷键管理面板、主题编辑器自定义界面）
- [ ] Keep core trio: AI 编辑面板 + Quick Commands + 翻译
- [ ] Real CWS screenshots (replace simulated HTML previews)
- [ ] Store listing: description, short description, feature graphic (1400×560)
- [ ] Submit for CWS review ($5 fee)

### v2.2 — AI 结构化理解 + Diff Tree
- [ ] 页面结构识别规则引擎
- [ ] DOM 级 diff tree 对比
- [ ] 智能批量操作提示

### v2.3 — 杀手级场景验证
- [ ] 选择 A/B/C 中的一个方向深入开发
- [ ] 用户反馈收集机制（内置简单 survey）
- [ ] PMF 指标定义和跟踪

### v3.0+ — 商业化
- [ ] PMF 验证后考虑轻量付费功能
- [ ] API 用量优化（缓存策略落地）

---

## 📦 CWS Release Checklist

- [x] Privacy policy page ✅
- [x] LICENSE (MIT) ✅
- [x] README.md ✅
- [x] CHANGELOG.md ✅
- [x] Icons at 16/48/128px ✅
- [x] `privacy_policy_url` in manifest.json → **RESOLVED (v2.1.0)**
- [ ] Real extension screenshots (replace simulated HTML)
- [ ] Store listing preparation (full description, feature graphic)
- [ ] Submit for review ($5 fee required)

---

## 🐛 Known Issues & Technical Debt

1. **content.js = 3980 lines single IIFE** (~177KB) — #1 technical debt, needs modularization for v2.1+
4. **Popup version hardcoded** in HTML — should use `chrome.runtime.getManifest()`
5. **Shadow DOM pages** not supported by content script injection
6. **Memory leak risk** — event listeners cleanup logic unverified

---

## 📊 版本快照 (2026-05-30 T+28 — Cron Check #14)

||| 项目 | 状态 |
|------|------|
| **当前版本** | **v2.1.0** ✅ |
| **Git sync** | ✅ Up to date with origin/master, clean working tree |
| **CWS blocker** | ✅ RESOLVED: `privacy_policy_url` added (v2.1.0) |
| **content.js size** | 3980 lines (⚠️ #1 tech debt) |
| **background.js** | 566 lines |
| **popup.js** | 618 lines |
| **Content CSS** | 1670 lines (~42KB) |
| **总行数** | ~6834 lines (v2.0 T+21 → +42% 膨胀, still same codebase) |

---

## 🔍 Cron Check Summary (T+29 — 2026-05-30)

1. ✅ Repository clean, fully synced with origin/master — no new commits since last check
2. ✅ CWS blocker (`privacy_policy_url`) still resolved in v2.1.0 commit `7def34b`
3. ⚠️ content.js unchanged at 3980 lines — no progress on low-usage feature removal yet
4. No branch divergence, no uncommitted changes — project is in stable state
5. Priority remains: **cut → CWS publish → go deep on AI editing**

---

## 🗺️ Next Actions (by priority)

1. 🔴 **v2.1: cut low-usage features** — remove keyboard shortcut manager popup UI, simplify theme editor to Light/Dark toggle only
2. 🔴 **CWS submission prep** — real extension screenshots (not HTML mocks), store listing description, feature graphic (1400×560), $5 fee
3. 🟡 **content.js modularization** — split into editor-core / commands / inspector / snippets / theming modules
4. 🟢 **AI 结构化页面理解** (P1 #4) — DOM structure recognition rules engine before calling LLM
5. 🟢 **Diff Tree upgrade** (P1 #6) — DOM attribute-level diff vs. current text-only diff
