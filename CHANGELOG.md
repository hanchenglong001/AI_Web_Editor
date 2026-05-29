# Changelog

All notable changes to AI Web Editor Chrome Extension.

## [1.1.0] - 2026-05-30

### Added
- **Undo/Redo**: Ctrl+Z / Ctrl+Y support with visual buttons (↩ ↪) in panel header
- **Export HTML/CSS**: ⬇ button exports selected element's HTML or CSS as downloadable files, also copies to clipboard
- **HTML Editor Tab**: Directly edit and apply HTML code changes to any element
- **12 Quick Commands**: 改写、简化、专业语气、有趣化、翻译中文/英文/日文、更短、更长、SEO优化、要点列表、亲切语气
- **Theme Toggle**: ◑ button switches between dark/light mode, persisted in storage
- **Daily Usage Limit**: Configurable daily call limit (default 50), shown in panel footer with progress color coding
- **Model Selector**: Choose any model name (GPT-4o-mini by default, configurable for custom APIs)
- **API Retry Logic**: Automatic retry with exponential backoff (up to 3 attempts)
- **Local Fallback**: Graceful degradation when API unavailable — basic text transformations still work
- **Usage Stats Tab**: View today's usage count and remaining quota in popup

### Changed
- Rewrote `background.js` — proper storage-based config, multi-provider support (OpenAI + custom endpoints), Ollama compatibility with fallback
- Improved `content.js` — event delegation for all interactions, localStorage-persisted history, cleaner state management
- Enhanced `content.css` — smooth cubic-bezier animations, hover states on all interactive elements, responsive layout
- Updated `popup.html/js` — 3-tab interface (API/Usage/Help), model selector, daily limit config, connection test

### Fixed
- Manifest paths updated from `src/` subdirectory to flat structure
- CSP updated to allow custom API endpoints
- Content script excludes Chrome Web Store pages (can't inject there)
- Keyboard shortcuts don't conflict with page content (only active when panel open)

## [1.0.0] - 2026-05-30

### Initial Release
- Element selection via floating ✦ button
- AI modification panel with text commands and quick-action buttons
- Style editor (color, background, font-size, font-weight, border-radius, opacity, padding, margin)
- History panel for re-applying previous changes
- OpenAI API integration via service worker
- Popup settings for API key configuration
- Dark theme UI
- Local fallback mode
