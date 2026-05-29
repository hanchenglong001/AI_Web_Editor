// AI Web Editor — Content Script v1.1
// Element selection, AI editor panel, real-time modification, undo/redo, export

(function () {
  'use strict';

  if (window.__awe_injected) return;
  window.__awe_injected = true;

  let selectedElement = null;
  let isSelectingMode = false;
  let isOpen = false;
  let undoStack = [];
  let redoStack = [];
  let currentTheme = 'dark'; // dark | light

  // ============================================================
  // DOM Creation
  // ============================================================

  function createTriggerBtn() {
    const btn = document.createElement('button');
    btn.id = 'awe-trigger-btn';
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white"/></svg>';
    btn.title = 'AI Web Editor';
    btn.addEventListener('click', toggleSelectMode);
    document.body.appendChild(btn);
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'awe-selection-overlay';
    overlay.addEventListener('click', handleElementClick);
    overlay.addEventListener('mouseenter', handleElementHover, true); // capture phase
    document.body.appendChild(overlay);
  }

  function createEditorPanel() {
    const panel = document.createElement('div');
    panel.id = 'awe-editor-panel';
    panel.innerHTML = `
      <div id="awe-panel-header">
        <h3>✦ AI Web Editor</h3>
        <div id="awe-header-actions">
          <button id="awe-undo-btn" title="Undo (Ctrl+Z)" disabled>↩</button>
          <button id="awe-redo-btn" title="Redo (Ctrl+Y)" disabled>↪</button>
          <button id="awe-export-btn" title="Export">⬇</button>
          <button id="awe-theme-btn" title="Toggle theme">◑</button>
          <button id="awe-close-btn">×</button>
        </div>
      </div>
      <div id="awe-element-preview">
        <span id="awe-element-tag">&lt;div&gt;</span>
        <div id="awe-element-text" title="">Click an element to select it</div>
      </div>
      <div id="awe-tabs">
        <button class="awe-tab-btn active" data-tab="ai">✦ AI</button>
        <button class="awe-tab-btn" data-tab="style">◐ Style</button>
        <button class="awe-tab-btn" data-tab="html">⟨/⟩ HTML</button>
        <button class="awe-tab-btn" data-tab="history">↺ History</button>
      </div>
      <div id="awe-tab-content">
        <div class="awe-tab-panel active" id="tab-ai">
          <div class="awe-quick-commands" id="quick-commands"></div>
          <textarea id="awe-command-input" placeholder="Tell AI how to modify...&#10;e.g. 'Make this more professional' or 'Translate to Chinese'" rows="3"></textarea>
          <button id="awe-send-btn">✨ Apply</button>
        </div>
        <div class="awe-tab-panel" id="tab-style"></div>
        <div class="awe-tab-panel" id="tab-html">
          <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:6px;">Edit HTML directly:</label>
          <textarea id="html-edit-area" placeholder="<span>New content...</span>" rows="5" style="width:100%;min-height:80px;background:#0f0f23;border:1px solid #2d2d4a;border-radius:6px;color:#e2e8f0;padding:10px;font-size:13px;font-family:monospace;resize:vertical;outline:none;"></textarea>
          <button id="html-apply-btn" style="width:100%;padding:10px;margin-top:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:6px;color:white;font-weight:600;cursor:pointer;">Apply HTML</button>
        </div>
        <div class="awe-tab-panel" id="tab-history">
          <div id="awe-history-list"></div>
        </div>
      </div>
      <div id="awe-status-bar">
        <span id="awe-daily-usage">Usage: 0/50</span>
        <span id="awe-status-msg"></span>
      </div>
    `;
    document.body.appendChild(panel);
  }

  // ============================================================
  // Quick Commands Data
  // ============================================================

  const QUICK_COMMANDS = {
    ai: [
      // General
      { cmd: 'rewrite', zh: '改写' },
      { cmd: 'simplify', zh: '简化' },
      { cmd: 'professional', zh: '专业语气' },
      { cmd: 'funnier', zh: '有趣化' },
      { cmd: 'tone-warm', zh: '亲切语气' },
      // Translations
      { cmd: 'translate-zh', zh: '翻译中文' },
      { cmd: 'translate-en', zh: '翻译英文' },
      { cmd: 'translate-ja', zh: '翻译日文' },
      { cmd: 'translate-ko', zh: '翻译韩文' },
      { cmd: 'translate-es', zh: '翻译西班牙文' },
      // Length
      { cmd: 'shorter', zh: '更短' },
      { cmd: 'longer', zh: '更长' },
      { cmd: 'bullet-points', zh: '要点列表' },
      // Specialized
      { cmd: 'seo-optimise', zh: 'SEO优化' },
      { cmd: 'product-desc', zh: '电商产品描述' },
      { cmd: 'tweet-style', zh: '推特风格(280字)' },
      { cmd: 'weibo-style', zh: '微博风格' },
      { cmd: 'explain-code', zh: '解释代码' },
      { cmd: 'add-comments', zh: '添加注释' },
      { cmd: 'professional-email', zh: '正式商务邮件' },
      { cmd: 'fix-grammar', zh: '修复语法' },
    ],
  };

  // ============================================================
  // Build Quick Commands UI
  // ============================================================

  function buildQuickCommands() {
    const container = document.getElementById('quick-commands');
    if (!container) return;
    container.innerHTML = QUICK_COMMANDS.ai.map(q =>
      `<button class="awe-quick-btn" data-cmd="${q.cmd}">${q.zh}</button>`
    ).join('');
  }

  // ============================================================
  // Build Style Tab UI
  // ============================================================

  function buildStyleTab() {
    const container = document.getElementById('tab-style');
    if (!container) return;
    container.innerHTML = `
      <div class="awe-style-group">
        <label>Text Color</label>
        <div class="awe-style-row"><input type="color" id="st-color" class="awe-style-input" value="#000000"><button class="awe-apply-btn" data-sa="setColor">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Background Color</label>
        <div class="awe-style-row"><input type="color" id="st-bg" class="awe-style-input" value="#ffffff"><button class="awe-apply-btn" data-sa="setBgColor">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Font Size (px)</label>
        <div class="awe-style-row"><input type="number" id="st-fs" class="awe-style-input" value="16" min="4" max="200"><button class="awe-apply-btn" data-sa="setFontSize">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Font Weight</label>
        <div class="awe-style-row"><select id="st-fw" class="awe-style-input"><option value="normal">Normal</option><option value="500">Medium</option><option value="600">Semi Bold</option><option value="bold">Bold</option></select><button class="awe-apply-btn" data-sa="setFontWeight">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Border Radius (px)</label>
        <div class="awe-style-row"><input type="number" id="st-rad" class="awe-style-input" value="0" min="0" max="100"><button class="awe-apply-btn" data-sa="setRadius">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Opacity (0-1)</label>
        <div class="awe-style-row"><input type="number" id="st-op" class="awe-style-input" value="1" min="0" max="1" step="0.05"><button class="awe-apply-btn" data-sa="setOpacity">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Padding (px)</label>
        <div class="awe-style-row"><input type="number" id="st-pad" class="awe-style-input" value="0" min="0" max="100"><button class="awe-apply-btn" data-sa="setPadding">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Margin (px)</label>
        <div class="awe-style-row"><input type="number" id="st-mar" class="awe-style-input" value="0" min="-50" max="100"><button class="awe-apply-btn" data-sa="setMargin">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Cursor</label>
        <div class="awe-style-row"><select id="st-cursor" class="awe-style-input"><option value="default">Default</option><option value="pointer">Pointer</option><option value="move">Move</option><option value="not-allowed">Not Allowed</option></select><button class="awe-apply-btn" data-sa="setCursor">Apply</button></div>
      </div>
      <div class="awe-style-group">
        <label>Text Align</label>
        <div class="awe-style-row"><select id="st-ta" class="awe-style-input"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select><button class="awe-apply-btn" data-sa="setTextAlign">Apply</button></div>
      </div>
      <hr style="border:none;border-top:1px solid #2d2d4a;margin:16px 0;">
      <button id="st-reset-all" style="width:100%;padding:8px;background:#ef4444;border:none;border-radius:6px;color:white;font-size:12px;cursor:pointer;">Reset All Styles</button>
    `;
  }

  // ============================================================
  // Commands API Mapping
  // ============================================================

  const COMMAND_PROMPTS = {
    'rewrite': 'Rewrite this content to be more engaging, clear, and compelling.',
    'simplify': 'Simplify the text so it is easy to understand for anyone. Short sentences preferred.',
    'professional': 'Rewrite in a professional, formal business tone.',
    'funnier': 'Make this content funnier and more entertaining while keeping the core message.',
    'translate-zh': 'Translate this text to Simplified Chinese (简体中文).',
    'translate-en': 'Translate this text to English naturally.',
    'translate-ja': 'Translate this text to Japanese (日本語).',
    'translate-ko': 'Translate this text to Korean (한국어).',
    'translate-es': 'Translate this text to Spanish (Español) naturally.',
    'shorter': 'Make this content much shorter and more concise. Keep only the essential meaning.',
    'longer': 'Expand and make this content longer with more details, examples, and elaboration.',
    'seo-optimise': 'Optimize this text for SEO: include relevant keywords naturally, make it scannable.',
    'bullet-points': 'Convert this into clear bullet points that are easy to scan.',
    'tone-warm': 'Rewrite in a warm, friendly, approachable tone as if talking to a friend.',
    // E-commerce & marketing
    'product-desc': 'Write a compelling e-commerce product description: highlight benefits, features, and use cases. Include SEO keywords naturally. Write in 150-250 words with a persuasive tone.',
    'tweet-style': 'Rewrite this as a tweet under 280 characters. Make it engaging, use hashtags if relevant, and include a hook to get people to click.',
    'weibo-style': '将这段内容改写为微博风格：口语化、带emoji表情、有话题标签（#xxx#），控制在200字以内，开头要吸引眼球。',
    // Code
    'explain-code': 'Explain what this code does in simple, clear language. Break down the key logic step by step.',
    'add-comments': 'Add helpful inline comments to this code explaining each major block and why it exists.',
    // Business & communication
    'professional-email': 'Rewrite this as a professional business email: formal greeting, clear purpose, polite closing. Make it respectful and concise.',
    'fix-grammar': 'Fix all grammar, spelling, and punctuation errors in this text while preserving the original meaning and tone. Return only the corrected text.',
  };

  // ============================================================
  // Element Selection
  // ============================================================

  function toggleSelectMode() {
    if (isOpen) { closePanel(); return; }
    isSelectingMode = !isSelectingMode;
    document.getElementById('awe-selection-overlay').classList.toggle('active', isSelectingMode);
    const btn = document.getElementById('awe-trigger-btn');
    btn.classList.toggle('active', isSelectingMode);
    btn.title = isSelectingMode ? 'Stop selection (ESC)' : 'AI Web Editor';
  }

  function handleElementClick(e) {
    if (!isSelectingMode) return;
    e.stopPropagation();
    let target = e.target;
    if (target.closest('#awe-trigger-btn') || target.closest('#awe-editor-panel')) return;
    selectedElement = target;
    highlightElement(target);
    updatePreview();
    isSelectingMode = false;
    document.getElementById('awe-selection-overlay').classList.remove('active');
    document.getElementById('awe-trigger-btn').classList.remove('active');
    openPanel();
  }

  function handleElementHover(e) {
    if (!isSelectingMode || !e.target.closest('#awe-selection-overlay')) return;
    let target = e.target;
    if (target.closest('#awe-trigger-btn') || target.closest('#awe-editor-panel')) return;
    clearHighlight();
    highlightElement(target);
  }

  function highlightElement(el) {
    clearHighlight();
    el.style.outline = '3px solid #6366f1';
    el.style.outlineOffset = '2px';
    el.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)';
  }

  function clearHighlight() {
    document.querySelectorAll('[style*="outline: 3px solid #6366f1"]').forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = '';
    });
  }

  function updatePreview() {
    if (!selectedElement) return;
    const tag = selectedElement.tagName.toLowerCase();
    const text = (selectedElement.textContent || '').trim().substring(0, 150);
    document.getElementById('awe-element-tag').textContent = `<${tag}>`;
    document.getElementById('awe-element-text').textContent = text;
    document.getElementById('awe-element-text').title = text;

    // Pre-populate style values
    const cs = window.getComputedStyle(selectedElement);
    try { document.getElementById('st-color').value = rgbToHex(cs.color) || '#000000'; } catch(e){}
    try { document.getElementById('st-bg').value = rgbToHex(cs.backgroundColor) || '#ffffff'; } catch(e){}
    try { document.getElementById('st-fs').value = parseInt(cs.fontSize); } catch(e){}
    try { document.getElementById('st-fw').value = cs.fontWeight; } catch(e){}
    try { document.getElementById('st-rad').value = parseInt(cs.borderRadius) || 0; } catch(e){}
    try { document.getElementById('st-op').value = parseFloat(cs.opacity); } catch(e){}
    try { document.getElementById('st-pad').value = parseInt(cs.padding); } catch(e){}
    try { document.getElementById('st-mar').value = parseInt(cs.margin); } catch(e){}
    try { document.getElementById('st-cursor').value = cs.cursor; } catch(e){}
    try { document.getElementById('st-ta').value = cs.textAlign; } catch(e){}

    // Pre-populate HTML editor
    if (document.getElementById('html-edit-area')) {
      document.getElementById('html-edit-area').value = selectedElement.outerHTML.substring(0, 2000);
    }
  }

  // ============================================================
  // Panel Open/Close
  // ============================================================

  function openPanel() {
    isOpen = true;
    document.getElementById('awe-editor-panel').classList.add('active');
    refreshHistory();
    refreshDailyUsage();
    applyTheme(currentTheme);
  }

  function closePanel() {
    isOpen = false;
    document.getElementById('awe-editor-panel').classList.remove('active');
    clearHighlight();
    selectedElement = null;
  }

  // ============================================================
  // Tab Switching (delegated in event handler below)
  // ============================================================

  function switchTab(tabName) {
    document.querySelectorAll('.awe-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.awe-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabName));
  }

  // ============================================================
  // Save State for Undo/Redo
  // ============================================================

  function saveState() {
    if (!selectedElement) return;
    const state = {
      outerHTML: selectedElement.outerHTML,
      tagName: selectedElement.tagName.toLowerCase(),
      timestamp: Date.now(),
    };
    undoStack.push(state);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = []; // new action clears redo
    updateUndoRedoButtons();
  }

  function undo() {
    if (undoStack.length === 0) return;
    const state = undoStack.pop();
    if (!selectedElement) return;
    // Push current to redo
    redoStack.push({ outerHTML: selectedElement.outerHTML, timestamp: Date.now() });
    restoreState(state);
    updateUndoRedoButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    restoreState({ ...state, tagName: selectedElement.tagName.toLowerCase() });
    updateUndoRedoButtons();
  }

  function restoreState(state) {
    if (!selectedElement || !state.outerHTML) return;
    // Replace element content with restored outerHTML
    const wrapper = document.createElement('div');
    wrapper.innerHTML = state.outerHTML;
    const restored = wrapper.firstElementChild;
    if (restored) {
      selectedElement.replaceWith(restored);
      // Re-select the new element
      selectedElement = restored;
      highlightElement(restored);
      updatePreview();
      showToast('Undo/Redo applied', 'success');
    }
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('awe-undo-btn');
    const redoBtn = document.getElementById('awe-redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  // ============================================================
  // Export HTML/CSS
  // ============================================================

  function exportHTML() {
    if (!selectedElement) { showToast('No element selected', 'error'); return; }
    saveState();
    const html = selectedElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-web-editor-${selectedElement.tagName.toLowerCase()}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML exported!', 'success');

    // Also copy to clipboard
    navigator.clipboard.writeText(html).catch(() => {});
  }

  function exportCSS() {
    if (!selectedElement) { showToast('No element selected', 'error'); return; }
    const cs = window.getComputedStyle(selectedElement);
    let css = `${selectedElement.tagName.toLowerCase()} {\n`;
    const props = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'borderRadius', 'opacity', 'padding', 'margin', 'textAlign', 'cursor'];
    props.forEach(prop => {
      try {
        const val = cs.getPropertyValue(prop);
        if (val && val !== '' && val !== 'normal' && val !== 'auto' && !val.startsWith('url')) {
          css += `  ${prop}: ${val};\n`;
        }
      } catch(e) {}
    });
    css += '}';

    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-web-editor-${selectedElement.tagName.toLowerCase()}-${Date.now()}.css`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSS exported!', 'success');
  }

  // ============================================================
  // Theme Toggle
  // ============================================================

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    chrome.storage.sync.set({ theme: currentTheme }, () => {});
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    const panel = document.getElementById('awe-editor-panel');
    if (!panel) return;
    if (theme === 'light') {
      panel.style.background = '#ffffff';
      panel.style.color = '#1a1a2e';
    } else {
      panel.style.background = '';
      panel.style.color = '';
    }
  }

  // ============================================================
  // AI Command Handler
  // ============================================================

  async function handleAICommand() {
    if (!selectedElement) { showStatus('请先选中页面元素', 'error'); return; }
    const cmdKey = document.getElementById('awe-command-input').value.trim();
    if (!cmdKey) { showStatus('请输入指令或点击快捷按钮', 'error'); return; }

    // Check if it's a known quick command key or free text
    let fullPrompt = COMMAND_PROMPTS[cmdKey] || cmdKey;
    const elementText = selectedElement.textContent?.trim() || '';
    const isHtml = selectedElement.innerHTML.trim() !== elementText; // has nested elements

    saveState();

    const btn = document.getElementById('awe-send-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="awe-spinner"></span> Processing...';
    showStatus('正在调用 AI...', '');

    try {
      chrome.runtime.sendMessage({
        action: 'ai-modify',
        command: fullPrompt,
        elementText: elementText,
        elementTag: selectedElement.tagName?.toLowerCase() || 'div',
        isHtml: isHtml,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AWEditor] Runtime error:', chrome.runtime.lastError);
          applyLocalModification(selectedElement, fullPrompt);
          showStatus('本地模式已应用', '');
          addToHistory(fullPrompt, 'ai-local');
          btn.disabled = false;
          btn.innerHTML = '✨ Apply';
          return;
        }

        if (response.limitReached) {
          showStatus('今日使用次数已达上限 (' + response.limit + '/天)', 'error');
          refreshDailyUsage();
          btn.disabled = false;
          btn.innerHTML = '✨ Apply';
          return;
        }

        if (response.needsApiKey) {
          showStatus('未配置 API Key，使用本地模式', '');
          applyLocalModification(selectedElement, fullPrompt);
          addToHistory(fullPrompt, 'ai-local');
        } else if (response.success && response.newContent) {
          const newContent = response.newContent;

          if (selectedElement.childNodes.length === 0 ||
              (selectedElement.childNodes.length === 1 && selectedElement.firstChild.nodeType === Node.TEXT_NODE)) {
            selectedElement.textContent = newContent;
          } else {
            // Complex element: replace first text node or wrap
            const walker = document.createTreeWalker(selectedElement, NodeFilter.SHOW_TEXT);
            let firstText = walker.nextNode();
            if (firstText) {
              firstText.textContent = newContent;
            } else {
              selectedElement.innerHTML = '<span>' + newContent + '</span>';
            }
          }

          // Also try HTML replacement if the content looks like HTML
          if (newContent.includes('<') && !COMMAND_PROMPTS[cmdKey]?.includes('translate')) {
            try {
              const temp = document.createElement('div');
              temp.innerHTML = newContent;
              if (temp.children.length > 0 || temp.textContent !== selectedElement.textContent) {
                selectedElement.outerHTML = newContent;
                // Re-select
                selectedElement = selectedElement?.parentElement?.querySelector('[style*="outline"]') || selectedElement;
              }
            } catch(e) {}
          }

          showStatus('AI 修改已应用', 'success');
          addToHistory(fullPrompt, 'ai');
        } else if (response.error) {
          showStatus('AI 调用失败: ' + response.error.substring(0, 80), 'error');
          applyLocalModification(selectedElement, fullPrompt);
          addToHistory(fullPrompt, 'ai-local');
        }

        btn.disabled = false;
        btn.innerHTML = '✨ Apply';
      });
    } catch (err) {
      console.error('[AWEditor] Error:', err);
      showStatus('错误: ' + err.message.substring(0, 80), 'error');
      applyLocalModification(selectedElement, fullPrompt);
      addToHistory(fullPrompt, 'ai-local');
      btn.disabled = false;
      btn.innerHTML = '✨ Apply';
    }
  }

  // ============================================================
  // Local Modification Fallback
  // ============================================================

  function applyLocalModification(el, command) {
    const text = el.textContent?.trim();
    if (!text) return;
    const lower = command.toLowerCase();

    if (lower.includes('translate') && lower.includes('chinese')) {
      el.textContent = '（AI翻译：' + text.substring(0, 40) + '）';
    } else if (lower.includes('translate') && lower.includes('english')) {
      el.textContent = '[EN] ' + text.substring(0, 40);
    } else if (lower.includes('translate') && lower.includes('japanese')) {
      el.textContent = '（AI訳：' + text.substring(0, 30) + '）';
    } else if (lower.includes('shorter')) {
      const words = text.split(/\s+/).slice(0, Math.max(3, Math.floor(text.split(/\s+/).length / 2)));
      el.textContent = words.join(' ') + '...';
    } else if (lower.includes('longer') || lower.includes('expand')) {
      el.textContent = text + '. [扩展内容 — 连接 API 可获得更完整的 AI 扩写。]';
    } else if (lower.includes('tweet') || lower.includes('weibo') || lower.includes('social')) {
      const emojis = ['🔥', '✨', '💡', '🚀', '😂', '❤️'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      el.textContent = `${emoji} ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`;
    } else if (lower.includes('product') || lower.includes('desc')) {
      el.textContent = `✨【推荐好物】\n` + text.substring(0, 40) + `\n👉 点击了解更多信息`;
    } else {
      // Default: wrap with styling to show AI modification
      const span = document.createElement('span');
      span.innerHTML = '[<span style="color:#6366f1;font-weight:bold">AI</span>] ' + text;
      if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) {
        el.textContent = '';
        el.appendChild(span);
      } else {
        const marker = document.createElement('span');
        marker.innerHTML = '[<span style="color:#6366f1;font-weight:bold">AI</span>] ';
        marker.style.color = '#6366f1';
        el.insertBefore(marker, el.firstChild);
      }
    }
  }

  // ============================================================
  // Style Actions
  // ============================================================

  function applyStyleAction(action) {
    if (!selectedElement) return;
    const getters = {
      setColor: () => document.getElementById('st-color'),
      setBgColor: () => document.getElementById('st-bg'),
      setFontSize: () => document.getElementById('st-fs'),
      setFontWeight: () => document.getElementById('st-fw'),
      setRadius: () => document.getElementById('st-rad'),
      setOpacity: () => document.getElementById('st-op'),
      setPadding: () => document.getElementById('st-pad'),
      setMargin: () => document.getElementById('st-mar'),
      setCursor: () => document.getElementById('st-cursor'),
      setTextAlign: () => document.getElementById('st-ta'),
    };
    const input = getters[action];
    if (!input) return;

    saveState();

    switch (action) {
      case 'setColor': selectedElement.style.color = input().value; break;
      case 'setBgColor': selectedElement.style.backgroundColor = input().value; break;
      case 'setFontSize': selectedElement.style.fontSize = input().value + 'px'; break;
      case 'setFontWeight': selectedElement.style.fontWeight = input().value; break;
      case 'setRadius': selectedElement.style.borderRadius = input().value + 'px'; break;
      case 'setOpacity': selectedElement.style.opacity = input().value; break;
      case 'setPadding': selectedElement.style.padding = input().value + 'px'; break;
      case 'setMargin': selectedElement.style.margin = input().value + 'px'; break;
      case 'setCursor': selectedElement.style.cursor = input().value; break;
      case 'setTextAlign': selectedElement.style.textAlign = input().value; break;
    }
  }

  function resetAllStyles() {
    if (!selectedElement) return;
    saveState();
    selectedElement.style.cssText = '';
    updatePreview();
    showToast('样式已重置', 'success');
  }

  // ============================================================
  // HTML Edit Tab
  // ============================================================

  function applyHTML() {
    if (!selectedElement) { showStatus('请先选中元素', 'error'); return; }
    const html = document.getElementById('html-edit-area').value.trim();
    if (!html) return;
    saveState();
    try {
      selectedElement.outerHTML = html;
      selectedElement = selectedElement?.parentElement?.querySelector('[style*="outline"]') || selectedElement;
      showStatus('HTML 已更新', 'success');
      addToHistory('HTML edit', 'html');
    } catch(e) {
      showStatus('HTML 解析失败: ' + e.message, 'error');
    }
  }

  // ============================================================
  // History (with localStorage persistence)
  // ============================================================

  let historyStore = [];

  function loadHistory() {
    try {
      const saved = localStorage.getItem('awe_history');
      if (saved) historyStore = JSON.parse(saved);
    } catch(e) {}
  }

  function saveHistory() {
    try { localStorage.setItem('awe_history', JSON.stringify(historyStore.slice(0, 50))); } catch(e) {}
  }

  function addToHistory(command, type) {
    historyStore.unshift({
      command: command.substring(0, 120),
      type,
      time: new Date().toLocaleTimeString(),
      elementTag: selectedElement?.tagName?.toLowerCase() || 'unknown',
      actionId: Date.now(),
    });
    if (historyStore.length > 50) historyStore.pop();
    saveHistory();
    refreshHistory();
  }

  function refreshHistory() {
    const container = document.getElementById('awe-history-list');
    if (!container) return;

    if (historyStore.length === 0) {
      container.innerHTML = '<p style="color:#64748b;font-size:13px;text-align:center;padding:20px 0;">暂无历史记录</p>';
      return;
    }

    container.innerHTML = historyStore.map(h => `
      <div class="awe-history-item" data-id="${h.actionId}">
        <div class="awe-history-command">${escapeHtml(h.command)}</div>
        <div class="awe-history-time"><${h.elementTag}> · ${h.time}</div>
      </div>
    `).join('');

    container.querySelectorAll('.awe-history-item').forEach(item => {
      item.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const entry = historyStore.find(h => h.actionId === id);
        if (entry) {
          // Re-open panel and show the command
          document.getElementById('awe-command-input').value = entry.command;
          switchTab('ai');
          openPanel();
        }
      });
    });
  }

  // ============================================================
  // Daily Usage Display
  // ============================================================

  function refreshDailyUsage() {
    chrome.runtime.sendMessage({ action: 'get-daily-usage' }, (response) => {
      const el = document.getElementById('awe-daily-usage');
      if (el && response) {
        el.textContent = `使用: ${response.usage}/${response.limit}`;
        if (response.usage >= response.limit) {
          el.style.color = '#ef4444';
        } else if (response.usage >= response.limit * 0.8) {
          el.style.color = '#f59e0b';
        }
      }
    });
  }

  // ============================================================
  // Status & Toast
  // ============================================================

  function showStatus(msg, type) {
    const el = document.getElementById('awe-status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = '';
    if (type) el.classList.add(type);
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 5000);
  }

  function showToast(msg, type) {
    let toast = document.getElementById('awe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'awe-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.borderColor = type === 'success' ? '#22c55e' : '#6366f1';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  // ============================================================
  // Event Delegation (all clicks in one handler)
  // ============================================================

  document.addEventListener('click', function (e) {
    const panel = document.getElementById('awe-editor-panel');
    if (!panel) return;

    // Close
    if (e.target.id === 'awe-close-btn') { closePanel(); return; }

    // Undo/Redo
    if (e.target.id === 'awe-undo-btn') { undo(); return; }
    if (e.target.id === 'awe-redo-btn') { redo(); return; }

    // Export
    if (e.target.id === 'awe-export-btn') { exportHTML(); return; }
    if (e.target.id === 'awe-theme-btn') { toggleTheme(); return; }

    // Tabs
    const tabBtn = e.target.closest('.awe-tab-btn');
    if (tabBtn) { switchTab(tabBtn.dataset.tab); return; }

    // Quick commands
    const quickBtn = e.target.closest('.awe-quick-btn');
    if (quickBtn && selectedElement) {
      document.getElementById('awe-command-input').value = QUICK_COMMANDS.ai.find(q => q.cmd === quickBtn.dataset.cmd)?.zh || '';
      switchTab('ai');
      return;
    }

    // Style apply buttons
    const styleBtn = e.target.closest('[data-sa]');
    if (styleBtn && selectedElement) { applyStyleAction(styleBtn.dataset.sa); showToast('样式已应用', 'success'); return; }

    // Reset all styles
    if (e.target.id === 'st-reset-all') { resetAllStyles(); return; }

    // Send / Apply buttons
    if (e.target.id === 'awe-send-btn') { handleAICommand(); return; }
    if (e.target.id === 'html-apply-btn') { applyHTML(); return; }
  });

  // Enter key in textarea → send
  document.addEventListener('keydown', function (e) {
    const cmdInput = document.getElementById('awe-command-input');
    if (e.key === 'Enter' && e.ctrlKey && cmdInput === document.activeElement) {
      handleAICommand();
    }

    // Escape to close
    if (e.key === 'Escape') {
      if (isSelectingMode) toggleSelectMode();
      else if (isOpen) closePanel();
    }

    // Undo/Redo shortcuts
    if (e.ctrlKey && e.key === 'z' && isOpen) { e.preventDefault(); undo(); }
    if ((e.ctrlKey && e.key === 'y') || (e.metaKey && e.key === 'z' && e.shiftKey) && isOpen) { e.preventDefault(); redo(); }
  });

  // ============================================================
  // Helpers
  // ============================================================

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb.startsWith('rgba')) return null;
    const m = rgb.match(/(\d+)/g);
    if (!m || m.length < 3) return null;
    return '#' + m.slice(0, 3).map(x => {
      const h = parseInt(x).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ============================================================
  // Init
  // ============================================================

  loadHistory();
  buildQuickCommands();
  buildStyleTab();
  createTriggerBtn();
  createOverlay();
  createEditorPanel();
})();
