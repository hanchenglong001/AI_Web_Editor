# 开发工作流程

记录 AI Web Editor 项目的开发流程、commit 规范、subagent TDD 分工和仓库管理经验。

## 核心原则

1. **源码必须在 `src/` 目录下** — 根目录只保留文档（README.md, TODO.md, CHANGELOG.md）
2. **superpowers 工作流** — Brainstorm → Plan → Subagent-Driven TDD Build → Review → Ship
3. **TDD 强制** — 每个 task 必须 write test first，red → green → refactor
4. **Subagent 驱动开发** — 复杂任务交给子代理执行，主 agent 负责编排和审查

## superpowers Pipeline

```
Idea → Brainstorm → Plan → Subagent-Driven Build (TDD) → Code Review → Ship
```

### Phase 1: Brainstorming

- 探索项目上下文（读文件、看代码结构、了解依赖）
- 一次问一个问题，用多选项引导决策
- 提出 2-3 个方案 + 推荐，逐段展示设计获取批准
- **硬规则：用户批准前不写任何代码**

### Phase 2: Writing Plans

- 将 feature 分解为 2-5 分钟的独立 task
- 每个 task = write test → watch fail → implement → watch pass → commit
- 保存到 `docs/plans/YYYY-MM-DD-feature.md`

### Phase 3: Subagent-Driven Development

对每个 task：
1. **Implementer subagent** — 执行 TDD 流程编写代码
2. **Spec-reviewer subagent** — 验证代码是否符合设计文档
3. **Code-quality reviewer subagent** — 检查代码质量
4. 修复问题，重新审查，通过则进入下一个 task

### Phase 4: Finishing

- 全量测试 → merge/PR → cleanup

## Commit 规范

使用 Conventional Commits：

```
feat(v1.3): batch editing mode — multi-select with Shift+Click, apply to all
fix: support custom API provider and relax CSP for Ollama/Gemini/Azure
refactor: remove old flat file structure, keep only src/ directory
chore: add test-content.py to .gitignore
docs: update TODO.md — add v1.5 priority...
```

格式：`<type>(vX.X): <summary>`，其中 type 可以是：
- `feat` — 新功能
- `fix` — bug 修复
- `refactor` — 重构（不改变功能）
- `chore` — 配置/依赖/文档变更
- `docs` — 纯文档更新

## Subagent 分工约定

| 角色 | 职责 | 使用场景 |
|------|------|---------|
| **Orchestrator** (主 agent) | 编排、决策、质量把关 | 所有任务 |
| **Implementer** (子代理) | TDD 编码实现 | 复杂功能开发 |
| **Spec-reviewer** (子代理) | 验证实现是否符合设计文档 | 每个 task 完成后 |
| **Code-quality reviewer** (子代理) | 代码审查（DRY、命名、错误处理） | 每个 task 完成后 |

## Git 仓库管理

### 项目位置

- **本地开发**: `~/Desktop/ai-web-editor-extension`（桌面目录）
- **远程**: `git@github.com:hanchenglong001/AI_Web_Editor.git`（GitHub）
- **历史备份**: Gitee 上保留完整 v1.0-v1.4 历史

### 仓库结构约束

```
根目录:
├── README.md              # 项目说明（中英双语）
├── CHANGELOG.md           # 版本变更记录
├── TODO.md                # 功能追踪
├── LICENSE                # MIT 许可证
├── .gitignore             # Git 忽略规则
└── support.png            # 捐赠二维码图片

src/                       # ← 所有源码必须在此目录下
├── manifest.json
├── background/
│   └── background.js
├── content-script/
│   └── content.js
├── content/
│   └── content.css
├── popup/
│   ├── popup.html
│   └── popup.js
└── icons/
    ├── icon16.png, icon48.png, icon128.png
    ├── icon16.svg (源文件)
    ├── gen_icons.py
    └── generate.html
```

**禁止行为：**
- 根目录保留 `.js`、`.html`、`.css` 源码文件（旧版 flat 结构残留）
- 重复的 src/ 子目录（如 `src/background/` 和根目录 `background/` 共存）
- 0 字节空文件

### 常见 Git 陷阱

| 场景 | 解决方案 |
|------|---------|
| Rebase README.md 冲突 | 保留双方的有用内容，不只选一边 |
| flat → subdirectory 迁移后历史断裂 | 新 initial commit + rebase 旧历史到新根上 |
| 远程已推送文档 commits（cron job）导致冲突 | fetch + rebase，resolve conflicts 后 push --force-with-lease |

## 版本管理流程

```
当前 HEAD: v1.4.0 (代码丢失回退到 v1.0 基础状态)
待做:     v1.5 — 基于当前代码重新开发完整功能 + superpowers TDD 流程

分支策略: master 为主分支，feature 在特性分支开发后合并
标签策略: git tag v1.x.x 用于发布版本（尚未配置）
```

## Session 知识传递

由于 Hermes Agent 的上下文窗口限制，每次新 session 需要通过以下方式重建项目上下文：

1. **Wiki 文档**（本文件 + docs/wiki/ 目录下所有文件）— 代码结构和架构说明
2. **TODO.md** — 功能优先级和进度追踪
3. **CHANGELOG.md** — 版本变更记录
4. **git log** — 提交历史

**建议：** 每次大改动后更新 wiki 对应模块文档，确保知识同步。

## 质量检查清单

每个 task 完成后自行验证：

- [ ] 代码是否符合设计文档规范？
- [ ] 是否使用 superpowers TDD 流程（red → green → refactor）？
- [ ] Content Script 中所有 CSS class 是否使用 `.awe-` 前缀？
- [ ] Background.js 是否正确从 `chrome.storage.sync` 读取配置？
- [ ] CSP 是否允许新增的 API endpoint？
- [ ] 代码文件是否在 `src/` 目录下？
- [ ] commit message 是否符合 Conventional Commits 规范？
- [ ] git status 是否 clean（无未跟踪的冗余文件）？
