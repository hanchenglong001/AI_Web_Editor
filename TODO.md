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