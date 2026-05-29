# AI Web Editor - Chrome Extension

Click any element on a webpage and use AI to modify its content or style in real-time.

## Features

- **Element Selection**: Click the ✦ button, then click any element on any webpage
- **AI Modification**: Type a natural language command (e.g., "Rewrite this title to be catchier") or use quick-action buttons
- **Style Editor**: Change colors, fonts, border-radius, opacity, padding, margin visually
- **History Panel**: Re-apply previous modifications with one click
- **Multi-API Support**: OpenAI GPT-4o-mini and any OpenAI-compatible API (Together AI, Ollama, etc.)

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `src/` folder: `ai-web-editor-extension/src/`
5. The extension is now loaded!

## Usage

1. **Click the ✦ button** in the bottom-right corner of any webpage
2. **Hover over elements** to preview selection (purple outline)
3. **Click an element** to select it — the AI editor panel opens
4. **Type a command** or use quick-action buttons:
   - Rewrite / Simplify / Translate to Chinese / Make Longer & Shorter
   - Professional Tone / Make it Fun
5. **Apply AI modification** — changes appear in real-time on the page

## Configuration

Click the extension icon (puzzle piece → ✦ icon) to:
- Set your OpenAI API key or custom API endpoint
- Choose between GPT-4o-mini or any OpenAI-compatible provider

## Local Mode (No API Key Required)

Without an API key, the extension uses built-in local modifications:
- Translate → wraps text with Chinese translation placeholder
- Shorter → truncates to first half of words
- Longer → appends expansion marker
- Default → adds "[AI]" prefix with accent color

## Monetization Ideas

### Freemium Model
- **Free tier**: Local modifications, basic style editing (up to 10/day)
- **Premium ($4.99/mo)**: Unlimited AI modifications, advanced prompts, priority API access
- **Team ($9.99/mo)**: Shared prompt library, collaboration features

### One-time Purchase / Open Source Core + Paid Plugin
- Core editor on Chrome Web Store (free)
- Premium AI addon sold separately

### Affiliate Monetization
- E-commerce mode: detect product pages, offer style/content optimization tools
- Partner with web design tools/services for referral links

### White-label / Enterprise
- Sell custom-branded version to agencies and developers

## Tech Stack

- **Manifest V3** Chrome extension architecture
- Vanilla JavaScript (no build step)
- CSS Grid + Flexbox for responsive UI
- chrome.storage.sync for persistent settings
- OpenAI-compatible REST API integration

## File Structure

```
src/
├── manifest.json           # Extension manifest (MV3)
├── background/             # Service worker
│   └── background.js       # AI API handling, message routing
├── content-script/         # Injected into webpages
│   └── content.js          # Element selection, editor panel logic
├── content/                # CSS injected into webpages
│   └── content.css         # All panel and trigger styles
├── popup/                  # Extension options UI
│   ├── popup.html          # Settings popup
│   └── popup.js            # Popup logic (API config)
└── icons/                  # Plugin icon assets
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## API Integration

The extension supports any OpenAI-compatible endpoint:

| Provider | Base URL | Model |
|----------|----------|-------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini |
| Together AI | `https://api.together.xyz/v1` | meta-llama/Llama-3-8b-chat-hf |
| Ollama (local) | `http://localhost:11434/api/openai` | any local model |
| Azure OpenAI | `{endpoint}/openai/deployments/{dep}/chat/completions?api-version=2024-02-01` | custom |

## License

MIT
