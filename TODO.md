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

| # | 功能 | 为什么不推荐 | 替代方案 |
|---|------|-------------|---------|
| ❌ 1 | **付费订阅后端** | 在核心产品没验证 PMF 之前做商业化太早 | 先免费积累用户，v3.0+ 再考虑 |
| ❌ 2 | **更多功能堆叠** (v2.0 已有十几个功能) | 工具箱合集 = 没有特色，用户记不住卖点 | 砍功能，做精品 |
| ❌ 3 | **继续堆模板/命令** (已有 27+ 命令) | 用户不知道怎么用，反而增加认知负担 | 精简为最常用的 5-8 个 |
| ❌ 4 | **跨浏览器支持** (Edge/Firefox/Safari) | 资源有限时应先做好 Chrome 扩展 | Chrome 验证 PMF 后再说 |
| ❌ 5 | **协作/团队编辑** | 偏离核心场景，开发成本极高 | 不考虑 |

---

## ✅ 建议做的（按优先级排序）

### P0 — 立即执行（砍功能 + 精简体验）

1. **审查并删除低使用率功能模块**
   - 快捷键管理器 → 只保留 manifest.json 的 `chrome.commands`，删掉 popup UI
   - 主题编辑器 → 只保留 Light/Dark 切换按钮，删掉自定义色板/保存/管理面板
   - CSS Rules Panel（如果存在）→ 合并到 Quick Commands 里

2. **重构核心交互流程** — 当前点击"AI Web Editor"图标弹出 popup 再选功能，太慢
   - 改为：右键元素 → 直接出现 AI 编辑面板（不需要先开 popup 再选编辑器 tab）
   - 或者：选中文字后浮出 mini-toolbar（类似浏览器原生右键菜单的增强版）

3. **CWS 发布前的真实截图** — 当前用的是模拟 HTML 页面生成的截图
   - 需要在实际扩展中截取真图
   - CWS 审核不通过的风险极高

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
   - 现有自动检测 + 多语言是好的基础
   - 增强：在页面元素上直接展示翻译结果（非覆盖式，而是类似 Google Translate 的 inline tooltip）
   - 支持"解释性翻译" — 不仅翻译文字，还解释文化背景差异

### P2 — PMF 验证 + 杀手级场景（v2.5+）

8. **找到并深耕一个杀手级场景** — 在以下方向中验证哪个有真实需求：
   - A: **信息抽取** — 圈选电商页面数据 → 一键导出表格
   - B: **无障碍改造** — 临时给页面添加 alt 文本、对比度调整（视障用户辅助）
   - C: **社交媒体内容生成** — 选中产品描述 → AI 改写为小红书/抖音文案风格

9. **缓存 + 离线能力**
   - 当前每次编辑都要调 AI API，成本高且依赖网络
   - 建立页面结构缓存，智能识别"上次已处理过的区域"
   - Diff 结果本地缓存，支持快速恢复

10. **Content script 性能优化**
    - profile content.js 加载时间
    - 审查事件监听器清理逻辑（内存泄漏排查）
    - Service Worker 消息可靠性

---

## 🎯 Version Roadmap

### v2.1 — 精简 + CWS 发布
- [ ] 删除低使用率功能 UI（快捷键管理面板、主题编辑器自定义界面、CSS Rules Panel）
- [ ] 保留 core：AI 编辑面板 + Quick Commands + 翻译（核心三件套）
- [ ] 真实截图替换模拟截图
- [ ] Chrome Web Store 提交

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

## 📦 CWS Release Checklist (Updated)

- [x] Privacy policy page ✅
- [x] LICENSE (MIT) ✅
- [x] README.md ✅
- [x] CHANGELOG.md ✅
- [x] Screenshots generated (simulated) — ⚠️ 需要替换为真实截图
- [ ] CWS store listing preparation (description, feature graphic)
- [ ] Submit for review

---

## 🐛 Current Bugs / Known Issues

1. **Vision 模型不可用** — 后端 qwen3.6 是 gguf 纯文本模型，不支持 image_url 多模态输入。需要换用 Qwen2-VL 或类似的多模态模型。
2. *(Add discovered issues here)*

---

## 📊 版本快照 (2026-05-30 T+24 — Cron Check #10)

| 项目 | 状态 |
|------|------|
| **当前版本** | **v2.0.0** ✅ (CWS Release Prep Complete) |
| **Git sync** | ✅ HEAD=ad2d581 (local snapshot committed, pushing…) |
| **content.js size** | 3980 lines (⚠️ needs modularization) |
| **background.js** | 566 lines ✅ |
| **popup.js** | 618 lines ✅ |
| **Content CSS** | 42KB — growing, needs cleanup |
| **CWS Assets** | ✅ 5 screenshots, CSP configured, privacy policy, LICENSE |
| **Manifest V3** | ⚠️ `privacy-policy_url` missing from manifest (CWS blocker) |

## 🔍 T+24 Cron Check Findings (2026-05-30)

1. **Remote TODO.md has strategic roadmap** — remote had a "做深不做广" strategy section while local had operational v2.1 roadmap. Both merged above.
2. **privacy-policy_url still missing from manifest.json** — CWS submission blocker (confirmed again).
3. **content.js at 3980 lines** — modularization is the #1 technical debt item for v2.1+.
4. **Git push rejected** — remote had new T+24 commit, rebase conflict resolved.

## 🗺️ 下一步建议 (T+24)

按优先级排序：

1. 🔴 **Add `privacy-policy_url` to manifest.json** — absolute CWS submission blocker. Privacy policy page exists at repo root but manifest has no URL field.
2. 🔴 **CWS Submission** — all assets ready ($5 fee required). Store listing description + feature graphic still needed.
3. 🟡 **content.js modularization** — 3980 lines single file. Split into: editor-core, commands, inspector, snippets, theming modules.
4. 🟡 **v2.1 implementation** — Snippet Library UI panel, Export/Import settings (JSON backup), CSS Presets. Consider "做深不做广" strategy: cut low-usage features first.
5. 🟢 **Real CWS screenshots** — current screenshots are simulated HTML previews; need real extension screenshots for CWS review.

## 💰 商业化路线图
