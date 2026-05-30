# Changelog

All notable changes to AI Web Editor Chrome Extension.

## [1.9.0] - 2026-05-30

### Added
- **Quick Commands Enhanced** — Command suggestions dropdown with autocomplete (type `/` to see all commands)
- **Multi-language Translate improvements** — Auto-detect page language, smart target language recommendations per region
- **Custom Theme Editor** — Save/load/delete custom themes via popup UI, 4 preset themes (Dark/Light/Ocean/Green), CSS variable-based styling for easy customization
- **Keyboard Shortcut Manager** — Record custom global keyboard shortcuts in popup UI, supports Ctrl+Shift+Key combinations
- **Global Hotkey Support** — `chrome.commands` in manifest.json, default shortcut `Ctrl+Shift+E` to toggle editor panel
- **Theme Editor Logic** — `applyCustomTheme()` function injects CSS variables for custom styling

### Changed
- Updated version references throughout codebase to 1.9.0

---

## [1.8.0] - 2026-05-30

### Added
- **Element Inspector tab** — DOM tree navigation panel with Computed Style viewer, element highlighting in page

### Changed
- Integrated into existing content.js IIFE structure without full rewrite

---

## [1.7.0] - 2026-05-30

### Added
- **Review Mode** — Review pending modifications before applying, granular accept/reject per change
- **Snippet Library** — Save and reuse custom code snippets across sessions
- **Auto-Detect Language** — Automatically detect page language on element selection
- **Code Highlight Editor** — Syntax highlighting for CSS/HTML/JS in the editor panel

---

## [1.6.0] - 2026-05-30

### Added
- **Diff Preview** — Before/after comparison of AI modifications
- **Element History** — Track and navigate through selected elements session history
- **Translate Overlay** — Inline translation overlay for selected text
- **CSS Rules Panel** — Add, edit, and preview custom CSS rules per-page

---

## [1.5.0] - 2026-05-30

### Changed
- **Code structure refactor: flat → `src/` directory** — All source files organized into subdirectories:
  - `background/background.js`, `content-script/content.js`, `content/content.css`, `popup/popup.html+js`
  - Manifest updated to reflect new paths (still MV3 compatible)
- **CSP fix**: Added `http://localhost:*`, `http://127.0.0.1:*` to connect-src for Ollama/LM Studio support + `https://generativelanguage.googleapis.com` for Gemini
- **Version bump**: 1.4.0 → 1.5.0

### Added
- **Dynamic version reading in popup** — Reads from `chrome.runtime.getManifest().version` instead of hardcoded value
- **.gitignore improvements** — Excludes generated icons, test files

### Removed
- Root-level flat JS/CSS/HTML files (consolidated into `src/`)
- `frist.txt`, `test-report.md`, empty directories

### Fixed
- Duplicate `background/` directory cleaned up — consolidated to single `background.js` at root level

---

## [1.4.0] - 2026-05-30

### Added
- **Rich context menu submenu** — Right-click any element → "AI Web Editor" submenu with:
  - ✨ Edit with AI — extracts element data and opens in editor panel
  - 🇨🇳 Translate to Chinese — one-click translation shortcut
  - 🇺🇸 Translate to English — one-click translation shortcut
  - ✂️ Shorten content — quick abbreviation
  - 📋 Open in AI Editor Panel — open the floating panel directly
- **Context menu element detection** — Automatically extracts tag, text content, HTML, computed styles, position, and className from right-clicked element
- **Full page HTML export** — Exports complete page with all AI modifications preserved, strips extension UI (trigger btn, panel, outlines, badges)
- **Content script ↔ background communication** — `chrome.runtime.onMessage` for context menu trigger coordination

### Fixed
- Duplicate `background/` directory cleaned up — consolidated to single `background.js` at root level

---

## [1.3.0] - 2026-05-30

### Added
- **Batch edit mode** — Edit multiple matching elements simultaneously
- **Custom CSS rules** — Add, edit, and preview custom CSS rules per-page
- **Code highlighting editor** — Syntax-highlighted code editor for CSS/HTML/JS

---

## [1.2.0] - 2026-05-30

### Added
- Model selector (Qwen, Gemini, GPT) with API endpoint configuration
- Usage limits and token tracking
- Extended quick commands (27+ total)

### Fixed
- Basic translation accuracy improvements

---

## [1.1.0] - 2026-05-30

### Added
- Undo/redo for all edits
- Export modified HTML
- HTML editor mode (raw HTML editing)
- Theme toggle (Light/Dark)
- Floating action button with context menu

---

## [1.0.0] - Initial Release
- Basic AI-powered element selection and editing
- Translation, shorten, style modification commands
