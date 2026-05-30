// AI Web Editor - Content Script
// Injected into every webpage. Provides element selection, AI editor panel, and real-time modification.

(function () {
  // Prevent double injection
  if (window.__awe_injected) return;
  window.__awe_injected = true;

  let selectedElement = null;
    let isSelectingMode = false;
    let isOpen = false;

    // ============================================================
    // Conversation Mode (v1.5)
    // ============================================================
    var conversationHistory = []; // [{role: 'user' | 'assistant', content: string}]

    // ============================================================
    // Batch Editing (v1.3)
    // ============================================================
    var batchSelectedElements = []; // Array of DOM elements for multi-select
    var isBatchMode = false;        // true when in batch mode

    function clearBatchSelection() {
          batchSelectedElements = [];
          isBatchMode = false;
          document.querySelectorAll('.awe-element-batch-selected').forEach(function(el) {
            el.classList.remove('awe-element-batch-selected');
            var badge = el.querySelector('.awe-batch-badge');
            if (badge) badge.remove();
          });
          var batchBtn = document.getElementById('awe-batch-apply-btn');
          if (batchBtn) batchBtn.style.display = 'none';
        }

    function handleBatchElementClick(e, target) {
      e.stopPropagation();
      clearHighlight();
      highlightElement(target);
      // Add to batch selection
      if (!batchSelectedElements.includes(target)) {
        batchSelectedElements.push(target);
      }
      target.classList.add('awe-element-batch-selected');
      // Show index badge
       var idx = batchSelectedElements.indexOf(target) + 1;
       showBatchBadge(target, idx);
       updatePreview(target);
       // Show batch apply button in toolbar
       var batchBtn = document.getElementById('awe-batch-apply-btn');
       if (batchBtn) {
         batchBtn.style.display = 'inline-block';
         batchBtn.title = 'Apply AI to ' + batchSelectedElements.length + ' selected element(s)';
       }
      }

    function showBatchBadge(el, index) {
      // Remove existing badge
      var existing = el.querySelector('.awe-batch-badge');
      if (existing) existing.remove();
      var badge = document.createElement('span');
      badge.className = 'awe-batch-badge';
      badge.textContent = index;
      badge.style.cssText = 'position:absolute;top:-10px;right:-10px;background:#6366f1;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;z-index:2147483647;pointer-events:none;';
      el.style.position = el.style.position || 'static';
      el.style.position = 'relative';
      el.appendChild(badge);
    }

    async function applyToAll() {
      if (batchSelectedElements.length === 0) return;
      var cmd = document.getElementById('awe-command-input').value.trim();
      if (!cmd) { showStatus('Enter a command first!', 'error'); return; }
      showStatus('Applying to ' + batchSelectedElements.length + ' elements...', '');
      for (var i = 0; i < batchSelectedElements.length; i++) {
        var el = batchSelectedElements[i];
        selectedElement = el;
        updatePreview(el);
        try {
          await chrome.runtime.sendMessage({
            action: 'ai-modify',
            command: cmd,
            elementText: el.textContent?.trim() || '',
            elementTag: el.tagName?.toLowerCase() || 'div',
          }, function(response) {
            if (response && response.success && response.newContent) {
              if (el.childNodes.length === 0 || (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE)) {
                el.textContent = response.newContent;
              } else {
                var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                var firstText = walker.nextNode();
                if (firstText) { firstText.textContent = response.newContent; }
              }
            }
          });
        } catch (err) { console.error('[Batch] Error on element ' + (i+1) + ':', err); }
        // Delay between requests to avoid rate limiting
        await new Promise(function(r) { setTimeout(r, 200); });
      }
      showStatus('Applied to all ' + batchSelectedElements.length + ' elements!', 'success');
    }

    function exportFullPageHTML() {
      var clone = document.documentElement.cloneNode(true);
      var selectors = ['#awe-trigger-btn', '#awe-selection-overlay', '#awe-editor-panel', '.awe-element-highlight', '.awe-element-batch-selected', '#awe-toast', '.awe-history-item', '#awe-batch-bar', '#awe-conversation-log'];
      clone.querySelectorAll(selectors.join(', ')).forEach(function(el) { el.remove(); });
      var html = '<!DOCTYPE html>\n<html>' + clone.innerHTML + '</html>';
      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'page-export.html'; a.click();
      URL.revokeObjectURL(url);
      showToast('Full page exported!', 'success');
    }

  // ============================================================
  // Undo/Redo System (v1.1)
  // ============================================================
  let undoStack = [];       // [{ html: string, type: 'ai'|'style'|'html', time: Date }]
  let redoStack = [];       // same structure

  function saveSnapshot() {
    if (!selectedElement) return;
    const entry = { html: selectedElement.innerHTML, type: 'unknown', time: new Date() };
    undoStack.push(entry);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = []; // New operation clears redo stack
  }

  function undo() {
    if (undoStack.length === 0 || !selectedElement) return;
    const current = { html: selectedElement.innerHTML, type: 'unknown' };
    const prev = undoStack.pop();
    if (!prev) return;
    selectedElement.innerHTML = prev.html;
    redoStack.push(current);
    updatePreview(selectedElement);
  }

  function redo() {
    if (redoStack.length === 0 || !selectedElement) return;
    const current = { html: selectedElement.innerHTML, type: 'unknown' };
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(current);
    selectedElement.innerHTML = next.html;
    updatePreview(selectedElement);
  }

  // ============================================================
  // Theme Toggle (v1.1)
  // ============================================================
  let currentTheme = localStorage.getItem('awe-theme') || 'dark';

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('awe-theme', theme);
    const panel = document.getElementById('awe-editor-panel');
    const overlay = document.getElementById('awe-selection-overlay');
    const htmlEditor = document.getElementById('awe-html-editor');

    if (theme === 'light') {
      panel.style.background = '#ffffff';
      panel.style.color = '#1a1a2e';
      overlay.style.background = 'rgba(0,0,0,0.1)';
      const tabContent = document.getElementById('awe-tab-content');
      if (tabContent) tabContent.style.background = '#f8fafc';
      document.querySelectorAll('.awe-tab-panel').forEach(function(el) {
        el.style.color = '#1a1a2e';
      });
      if (htmlEditor) {
        htmlEditor.style.background = '#ffffff';
        htmlEditor.style.color = '#1a1a2e';
        htmlEditor.style.borderColor = '#d1d5db';
      }
    } else {
      panel.style.background = ''; // revert to CSS
      panel.style.color = '';
      overlay.style.background = '';
      var tc = document.getElementById('awe-tab-content');
      if (tc) tc.style.background = '';
      document.querySelectorAll('.awe-tab-panel').forEach(function(el) {
        el.style.color = '';
      });
      if (htmlEditor) {
        htmlEditor.style.background = '#0f0f23';
        htmlEditor.style.color = '#e2e8f0';
        htmlEditor.style.borderColor = '#2d2d4a';
      }
    }
  }

  function toggleTheme() {
    var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // ============================================================
  // Export & Copy (v1.1)
  // ============================================================

  function exportElementHTML() {
    if (!selectedElement) { showToast('No element selected!', 'error'); return; }
    var html = selectedElement.outerHTML;
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'element-export.html'; a.click();
    URL.revokeObjectURL(url);
    showToast('HTML exported!', 'success');
  }

  function exportElementCSS() {
    if (!selectedElement) { showToast('No element selected!', 'error'); return; }
    var cs = window.getComputedStyle(selectedElement);
    var css = selectedElement.tagName.toLowerCase() + ' {\n';
    for (var i = 0; i < cs.length; i++) {
      var prop = cs[i];
      if (prop.startsWith('-webkit') || prop === 'content' || prop === 'all') continue;
      var val = cs.getPropertyValue(prop);
      css += '  ' + prop + ': ' + val + ';\n';
    }
    css += '}';
    var blob = new Blob([css], { type: 'text/css' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'element-export.css'; a.click();
    URL.revokeObjectURL(url);
    showToast('CSS exported!', 'success');
  }

  function copyElementToClipboard() {
    if (!selectedElement) { showToast('No element selected!', 'error'); return; }
    navigator.clipboard.writeText(selectedElement.outerHTML).then(function() {
      showToast('Copied to clipboard!', 'success');
    }).catch(function(err) {
      showToast('Failed to copy: ' + err.message, 'error');
    });
  }

  // ============================================================
  // Create and inject all DOM elements
  // ============================================================

  function createTriggerBtn() {
    var btn = document.createElement('button');
    btn.id = 'awe-trigger-btn';
    btn.innerHTML = '✦';
    btn.title = 'AI Web Editor — Click to select element';
    btn.addEventListener('click', toggleSelectMode);
    document.body.appendChild(btn);
  }

  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'awe-selection-overlay';
    overlay.addEventListener('click', handleElementClick);
    overlay.addEventListener('mouseenter', handleElementHover);
    document.body.appendChild(overlay);
  }

  function createEditorPanel() {
    var panel = document.createElement('div');
    panel.id = 'awe-editor-panel';
    panel.innerHTML = `
      <div id="awe-panel-header">
         <h3>✦ AI Web Editor</h3>
         <div id="awe-toolbar-btns">
            <button id="awe-undo-btn" title="Undo (Ctrl+Z)">↩</button>
            <button id="awe-redo-btn" title="Redo (Ctrl+Y)">↪</button>
            <button id="awe-theme-btn" title="Toggle Theme">◑</button>
            <button id="awe-export-btn" title="Export HTML/CSS">⬇</button>
            <button id="awe-copy-btn" title="Copy HTML to Clipboard">📋</button>
            <button id="awe-batch-apply-btn" title="Apply AI to all selected elements" style="display:none;">⇩ Apply All</button>
          </div>
         <button id="awe-close-btn" title="Close">×</button>
       </div>
      <div id="awe-element-preview">
        <span id="awe-element-tag">&lt;div&gt;</span>
        <div id="awe-element-text">Click an element to select it</div>
      </div>
      <div id="awe-tabs">
        <button class="awe-tab-btn active" data-tab="ai">AI Modify</button>
         <button class="awe-tab-btn" data-tab="style">Style</button>
         <button class="awe-tab-btn" data-tab="html">HTML</button>
         <button class="awe-tab-btn" data-tab="history">History</button>
      </div>
      <div id="awe-tab-content">
        <!-- AI Tab -->
        <div class="awe-tab-panel active" id="tab-ai">
          <div class="awe-quick-commands">
               <button class="awe-quick-btn" data-cmd="rewrite">Rewrite</button>
               <button class="awe-quick-btn" data-cmd="simplify">Simplify</button>
               <button class="awe-quick-btn" data-cmd="translate">Translate (ZH)</button>
               <button class="awe-quick-btn" data-cmd="longer">Make Longer</button>
               <button class="awe-quick-btn" data-cmd="shorter">Make Shorter</button>
               <button class="awe-quick-btn" data-cmd="tone-professional">Professional Tone</button>
               <button class="awe-quick-btn" data-cmd="funnier">Make it Fun</button>
               <!-- Translations (v1.2) -->
               <button class="awe-quick-btn" data-cmd="translate-es">🇪🇸 Spanish</button>
               <button class="awe-quick-btn" data-cmd="translate-fr">🇫🇷 French</button>
               <button class="awe-quick-btn" data-cmd="translate-ja">🇯🇵 Japanese</button>
               <button class="awe-quick-btn" data-cmd="translate-ko">🇰🇷 Korean</button>
               <button class="awe-quick-btn" data-cmd="translate-de">🇩🇪 German</button>
               <!-- Email/Professional (v1.2) -->
               <button class="awe-quick-btn" data-cmd="email-professional">📧 Professional Email</button>
               <button class="awe-quick-btn" data-cmd="fix-grammar">✍️ Fix Grammar</button>
               <!-- Code (v1.2) -->
               <button class="awe-quick-btn" data-cmd="explain-code">💻 Explain Code</button>
               <button class="awe-quick-btn" data-cmd="add-comments">📝 Add Comments</button>
               <!-- Social Media (v1.2) -->
               <button class="awe-quick-btn" data-cmd="tweet-style">🐦 Tweet Style</button>
               <button class="awe-quick-btn" data-cmd="weibo-style">📱 Weibo</button>
               <button class="awe-quick-btn" data-cmd="linkedin-style">💼 LinkedIn</button>
               <!-- Format (v1.2) -->
               <button class="awe-quick-btn" data-cmd="numbered-list">🔢 Numbered List</button>
               <button class="awe-quick-btn" data-cmd="bullet-points">📊 Bullet Points</button>
               <button class="awe-quick-btn" data-cmd="seo-meta">🏷️ SEO Meta</button>
               <button class="awe-quick-btn" data-cmd="markdown">📝 Markdown</button>
               <button class="awe-quick-btn" data-cmd="plain-english">👤 Plain English</button>
               <!-- Creative (v1.2) -->
               <button class="awe-quick-btn" data-cmd="poem">✒️ Poetic</button>
               <button class="awe-quick-btn" data-cmd="story">📖 Make it a Story</button>
               <button class="awe-quick-btn" data-cmd="bullet-points-cn">🔵 精简要点（中文）</button>
             </div>
             <!-- Conversation log (v1.5) -->
             <div class="awe-conversation-log" id="awe-conversation-log"></div>
             <div style="display:flex; gap:6px; margin-top:8px;">
             <textarea id="awe-command-input" placeholder="Tell AI how to modify this element...&#10;e.g. 'Rewrite this title to be more catchy'" style="flex:1;"></textarea>
             <button id="awe-send-btn">✨</button>
             </div>
             </div>
        <!-- Style Tab -->
        <div class="awe-tab-panel" id="tab-style">
          <div class="awe-style-group">
            <label>Text Color</label>
            <div class="awe-style-row">
              <input type="color" id="awe-style-color" class="awe-style-input" value="#000000">
              <button class="awe-apply-btn" data-action="setColor">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Background Color</label>
            <div class="awe-style-row">
              <input type="color" id="awe-style-bg" class="awe-style-input" value="#ffffff">
              <button class="awe-apply-btn" data-action="setBgColor">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Font Size (px)</label>
            <div class="awe-style-row">
              <input type="number" id="awe-style-fontsize" class="awe-style-input" value="16" min="8" max="200">
              <button class="awe-apply-btn" data-action="setFontSize">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Font Weight</label>
            <div class="awe-style-row">
              <select id="awe-style-fontweight" class="awe-style-input">
                <option value="normal">Normal (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi Bold (600)</option>
                <option value="bold">Bold (700)</option>
              </select>
              <button class="awe-apply-btn" data-action="setFontWeight">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Border Radius (px)</label>
            <div class="awe-style-row">
              <input type="number" id="awe-style-radius" class="awe-style-input" value="0" min="0" max="100">
              <button class="awe-apply-btn" data-action="setRadius">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Opacity (0-1)</label>
            <div class="awe-style-row">
              <input type="number" id="awe-style-opacity" class="awe-style-input" value="1" min="0" max="1" step="0.05">
              <button class="awe-apply-btn" data-action="setOpacity">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Padding (px)</label>
            <div class="awe-style-row">
              <input type="number" id="awe-style-padding" class="awe-style-input" value="0" min="0" max="100">
              <button class="awe-apply-btn" data-action="setPadding">Apply</button>
            </div>
          </div>
          <div class="awe-style-group">
            <label>Margin (px)</label>
            <div class="awe-style-row">
              <input type="number" id="awe-style-margin" class="awe-style-input" value="0" min="-50" max="100">
              <button class="awe-apply-btn" data-action="setMargin">Apply</button>
            </div>
          </div>
        </div>
        <!-- HTML Editor Tab -->
        <div class="awe-tab-panel" id="tab-html">
          <textarea id="awe-html-editor" rows="12" style="width:100%; font-family:monospace; background:#0f0f23; color:#e2e8f0; border:1px solid #2d2d4a; padding:8px; border-radius:6px; resize:vertical; font-size:12px;" spellcheck="false"></textarea>
          <button id="awe-html-apply-btn" style="margin-top:8px; width:100%;">Apply HTML Changes</button>
        </div>
        <!-- History Tab -->
        <div class="awe-tab-panel" id="tab-history">
          <div id="awe-history-list">
            <p style="color:#64748b; font-size:13px; text-align:center; padding:20px 0;">No actions yet. Select an element and try AI or Style edits.</p>
          </div>
        </div>
      </div>
      <div id="awe-status-msg"></div>
       <div id="awe-usage-stats" style="font-size:12px; color:#475569; text-align:center; padding:6px 0; border-top:1px solid #2d2d4a;">Today: loading...</div>
      `;
    document.body.appendChild(panel);
  }

  // ============================================================
  // Element selection logic
  // ============================================================

  function toggleSelectMode() {
    var overlay = document.getElementById('awe-selection-overlay');
    var btn = document.getElementById('awe-trigger-btn');

    if (isOpen) {
      closePanel();
      return;
    }

    isSelectingMode = !isSelectingMode;

    if (isSelectingMode) {
      overlay.classList.add('active');
      btn.classList.add('active');
      btn.innerHTML = 'Stop';
    } else {
      overlay.classList.remove('active');
      btn.classList.remove('active');
      btn.innerHTML = '✦';
      clearHighlight();
    }
  }

  function handleElementClick(e) {
     e.stopPropagation();
     var target = e.target;

     // Skip our own elements
     if (target.closest('#awe-trigger-btn') || target.closest('#awe-selection-overlay') || target.closest('#awe-editor-panel')) return;

     // v1.3: Shift+Click for batch multi-select
     if (e.shiftKey && isOpen) {
       handleBatchElementClick(e, target);
       return;
     }

     selectedElement = target;
     highlightElement(target);
     updatePreview(target);
     isSelectingMode = false;
     document.getElementById('awe-selection-overlay').classList.remove('active');
     document.getElementById('awe-trigger-btn').classList.remove('active');
     document.getElementById('awe-trigger-btn').innerHTML = '✦';
     openPanel();
   }

  function handleElementHover(e) {
    if (!isSelectingMode) return;
    var target = e.target;
    if (target.closest('#awe-trigger-btn') || target.closest('#awe-editor-panel')) return;
    clearHighlight();
    highlightElement(target);
  }

  function highlightElement(el) {
    clearHighlight();
    el.classList.add('awe-element-highlight');
  }

  function clearHighlight() {
    document.querySelectorAll('.awe-element-highlight').forEach(function(el) {
      el.classList.remove('awe-element-highlight');
    });
  }

  function updatePreview(el) {
    var tag = el.tagName.toLowerCase();
    var text = (el.textContent || '').trim().substring(0, 120);
    document.getElementById('awe-element-tag').textContent = '<' + tag + '>';
    document.getElementById('awe-element-text').textContent = text + (text.length >= 120 ? '...' : '');

    // Pre-populate style tab with current values
    var computed = window.getComputedStyle(el);
    document.getElementById('awe-style-color').value = rgbToHex(computed.color) || '#000000';
    document.getElementById('awe-style-bg').value = rgbToHex(computed.backgroundColor) || '#ffffff';
    document.getElementById('awe-style-fontsize').value = parseInt(computed.fontSize) || 16;
    document.getElementById('awe-style-fontweight').value = computed.fontWeight || 'normal';
    document.getElementById('awe-style-radius').value = parseInt(computed.borderRadius) || 0;
    document.getElementById('awe-style-opacity').value = parseFloat(computed.opacity) || 1;
    document.getElementById('awe-style-padding').value = parseInt(computed.padding) || 0;
    document.getElementById('awe-style-margin').value = parseInt(computed.margin) || 0;

    // Update HTML editor if visible
    var htmlEditor = document.getElementById('awe-html-editor');
    if (htmlEditor) {
      htmlEditor.value = el.outerHTML;
    }
  }

  // ============================================================
  // Panel open/close
  // ============================================================

  function openPanel() {
    isOpen = true;
    document.getElementById('awe-editor-panel').classList.add('active');
  }

  function closePanel() {
    isOpen = false;
    document.getElementById('awe-editor-panel').classList.remove('active');
    clearHighlight();
  }

  // ============================================================
  // Tab switching
  // ============================================================

  document.addEventListener('click', function (e) {
    // Close button
    if (e.target.id === 'awe-close-btn') {
      closePanel();
      return;
    }

    // Undo/Redo buttons (v1.1)
    if (e.target.id === 'awe-undo-btn') {
      undo();
      showToast('Undo applied', 'success');
      return;
    }
    if (e.target.id === 'awe-redo-btn') {
      redo();
      showToast('Redo applied', 'success');
      return;
    }

    // Theme toggle button (v1.1)
    if (e.target.id === 'awe-theme-btn') {
      toggleTheme();
      showToast('Theme: ' + currentTheme, 'success');
      return;
    }

    // Export button — v1.3: cycle through HTML / CSS / Full Page / Apply to All
     if (e.target.id === 'awe-export-btn') {
       var cmdText = document.getElementById('awe-command-input').value.trim();
       if (batchSelectedElements.length > 0 && cmdText) {
         applyToAll();
       } else if (!selectedElement) {
         exportFullPageHTML();
       } else {
         // Alternate: HTML first, then CSS on second click
         var lastExport = localStorage.getItem('awe-last-export');
         if (lastExport === 'css') {
           exportElementHTML();
           localStorage.setItem('awe-last-export', 'html');
         } else {
           exportElementCSS();
           localStorage.setItem('awe-last-export', 'css');
         }
       }
       return;
     }

    // Copy button (v1.1)
      if (e.target.id === 'awe-copy-btn') {
        copyElementToClipboard();
        return;
      }

      // Batch Apply to All button (v1.3)
      if (e.target.id === 'awe-batch-apply-btn') {
        applyToAll();
        return;
      }

    // Tab buttons
    var tabBtn = e.target.closest('.awe-tab-btn');
    if (tabBtn) {
      document.querySelectorAll('.awe-tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.awe-tab-panel').forEach(function(p) { p.classList.remove('active'); });
      tabBtn.classList.add('active');
      var tabId = 'tab-' + tabBtn.dataset.tab;
      document.getElementById(tabId).classList.add('active');
      return;
    }

    // Quick command buttons
      var quickBtn = e.target.closest('.awe-quick-btn');
      if (quickBtn && selectedElement) {
        var cmd = quickBtn.dataset.cmd;
        var commands = {
          'rewrite': 'Rewrite this content to be more engaging and clear.',
          'simplify': 'Simplify the text so it is easier to understand.',
          'translate': 'Translate this text to Chinese (简体中文).',
          'longer': 'Expand and make this content longer and more detailed.',
          'shorter': 'Make this content much shorter and concise.',
          'tone-professional': 'Rewrite in a professional, formal tone.',
          'funnier': 'Make this content funnier and more entertaining.',
          // Translations (v1.2)
          'translate-es': 'Traduce este texto al español.',
          'translate-fr': "Traduis ce texte en français.",
          'translate-ja': 'このテキストを日本語に翻訳してください。',
          'translate-ko': '이 텍스트를 한국어로 번역해주세요.',
          'translate-de': 'Übersetzen Sie diesen Text ins Deutsche.',
          // Email/Professional (v1.2)
          'email-professional': 'Write a professional, formal business email based on this content.',
          'fix-grammar': 'Fix all grammar and spelling errors while preserving the original meaning.',
          // Code (v1.2)
          'explain-code': 'Explain what this code does in simple terms.',
          'add-comments': 'Add clear, concise comments to explain each part of this content.',
          // Social Media (v1.2)
          'tweet-style': 'Rewrite as a catchy tweet under 280 characters.',
          'weibo-style': '重写为微博风格的短文，使用合适的 Emoji。',
          'linkedin-style': 'Write a professional LinkedIn post based on this content.',
          // Format (v1.2)
          'numbered-list': 'Convert this content into a numbered list with key points.',
          'bullet-points': 'Summarize this as bullet points with the most important information.',
          'seo-meta': 'Write an SEO-friendly meta description (150 characters) for this content.',
          'markdown': 'Convert this plain text into well-formatted Markdown.',
          'plain-english': 'Rewrite in simple, easy-to-understand language for a general audience.',
          // Creative (v1.2)
          'poem': 'Rewrite as a beautiful short poem.',
          'story': 'Turn this content into a short narrative story.',
          'bullet-points-cn': '将这段内容总结为3-5条中文要点。',
          };
          // Check if this is a template (v1.5)
          if (cmd.startsWith('template_')) {
           var templateId = cmd.replace('template_', '');
           chrome.storage.sync.get(['customTemplates'], function(tplResult) {
             var templates = tplResult.customTemplates || [];
             var tpl = templates.find(function(t) { return t.id === templateId; });
             if (tpl) {
               document.getElementById('awe-command-input').value = tpl.prompt;
             }
           });
          } else {
           document.getElementById('awe-command-input').value = commands[cmd] || '';
          }
          // Switch to AI tab
      document.querySelectorAll('.awe-tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.awe-tab-panel').forEach(function(p) { p.classList.remove('active'); });
      document.querySelector('.awe-tab-btn[data-tab="ai"]').classList.add('active');
      document.getElementById('tab-ai').classList.add('active');
      return;
    }

    // Style apply buttons
    var styleBtn = e.target.closest('[data-action]');
    if (styleBtn && selectedElement) {
      var action = styleBtn.dataset.action;
      saveSnapshot(); // v1.1: save before each style change
      applyStyleAction(action, selectedElement);
      showToast('Style applied!', 'success');
      return;
    }

    // Send button
    if (e.target.id === 'awe-send-btn') {
      handleAICommand();
      return;
    }

    // HTML Apply button (v1.1)
    if (e.target.id === 'awe-html-apply-btn' && selectedElement) {
      try {
        saveSnapshot(); // for undo
        var newHTML = document.getElementById('awe-html-editor').value;
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML;
        if (tempDiv.children.length === 1 || tempDiv.children.length === 0) {
          selectedElement.innerHTML = newHTML;
          updatePreview(selectedElement);
          showToast('HTML applied!', 'success');
        } else {
          showStatus('Error: HTML must contain a single root element', 'error');
        }
      } catch (err) {
        showStatus('Invalid HTML: ' + err.message, 'error');
      }
      return;
    }

    // History items click
    var historyItem = e.target.closest('.awe-history-item');
    if (historyItem) {
      var action = historyItem.dataset.action;
      restoreHistoryAction(action);
      showToast('Restored previous change', 'success');
      return;
    }
  });

  // ============================================================
  // AI command handling
  // ============================================================

  async function handleAICommand() {
     if (!selectedElement) {
       showStatus('Please select an element first!', 'error');
       return;
     }

     saveSnapshot(); // v1.1: save before AI modifies

     var cmd = document.getElementById('awe-command-input').value.trim();
     if (!cmd) {
       showStatus('Please enter a command.', 'error');
       return;
     }

     var btn = document.getElementById('awe-send-btn');
     btn.disabled = true;
     btn.innerHTML = '<span class="awe-spinner"></span> Processing...';
     showStatus('Sending to AI...', '');

     // Build the effective prompt (with conversation history if available)
     var effectivePrompt = cmd;
     try {
       // v1.5: check for template first
       var tplResult = await new Promise(function(resolve) {
         chrome.storage.sync.get(['customTemplates'], function(r) { resolve(r.customTemplates || []); });
       });

       // If conversation mode (multiple turns), include history in the prompt
       if (conversationHistory.length > 0) {
         effectivePrompt = '';
         for (var i = 0; i < conversationHistory.length; i++) {
           var msg = conversationHistory[i];
           if (msg.role === 'user') {
             effectivePrompt += msg.content + '\n';
           } else if (msg.role === 'assistant' && msg.newContent) {
             effectivePrompt += '[Previous AI output was applied]\n';
           }
         }
         effectivePrompt += cmd;
       }
     } catch(e) {}

     try {
       // Try sending through service worker (which forwards to API)
       var messagePayload = {
         action: 'ai-modify',
         command: effectivePrompt,
         elementText: selectedElement.textContent?.trim() || '',
         elementTag: selectedElement.tagName?.toLowerCase() || 'div',
       };
       // v1.5: pass conversation history to background
       if (conversationHistory.length > 0) {
         messagePayload.conversationHistory = conversationHistory;
       }
       var response = await chrome.runtime.sendMessage(messagePayload);

       if (response.success && response.newContent) {
            // Increment daily usage counter
            chrome.runtime.sendMessage({ action: 'increment-usage' }, function(usageResp) {
              updateUsageStats();
            });

            // Check if limit exceeded after increment
            chrome.runtime.sendMessage({ action: 'get-daily-usage' }, function(limitResp) {
              if (limitResp && limitResp.count >= limitResp.limit) {
                showStatus('⚠️ Daily usage limit reached (' + limitResp.count + '/' + limitResp.limit + ')', 'error');
              }
            });

            // For text content modifications
         if (selectedElement.childNodes.length === 0 || (selectedElement.childNodes.length === 1 && selectedElement.firstChild.nodeType === Node.TEXT_NODE)) {
           selectedElement.textContent = response.newContent;
         } else {
           // For complex elements, try innerText replacement on first text node
           var walker = document.createTreeWalker(selectedElement, NodeFilter.SHOW_TEXT);
           var firstText = walker.nextNode();
           if (firstText) {
             firstText.textContent = response.newContent;
           } else {
             // Fallback: create a new span with the content
             var span = document.createElement('span');
             span.innerHTML = response.newContent;
             selectedElement.innerHTML = '';
             selectedElement.appendChild(span);
           }
         }

         // v1.5: Update conversation history and render log
         conversationHistory.push({ role: 'user', content: cmd, timestamp: Date.now() });
         conversationHistory.push({ role: 'assistant', content: response.newContent, newContent: response.newContent, timestamp: Date.now() });
         renderConversationLog();

         showStatus('AI modification applied!', 'success');
         addToHistory(cmd, 'ai', JSON.stringify({ newContent: response.newContent }));
       } else {
         // API not configured or failed — show local fallback
         applyLocalModification(selectedElement, cmd);
         showStatus('API not connected. Applied local modification.', '');

         // Still log to conversation (local mode)
         var localOutput = selectedElement.textContent;
         conversationHistory.push({ role: 'user', content: cmd, timestamp: Date.now() });
         conversationHistory.push({ role: 'assistant', content: '[Local fallback applied]', newContent: localOutput, timestamp: Date.now() });
         renderConversationLog();

         addToHistory(cmd, 'ai-local', null);
       }
     } catch (err) {
       console.error('[AI Web Editor] Error:', err);
       // Local fallback
       applyLocalModification(selectedElement, cmd);
       showStatus('API not available. Applied local modification.', '');

       conversationHistory.push({ role: 'user', content: cmd, timestamp: Date.now() });
       conversationHistory.push({ role: 'assistant', content: '[Error: ' + err.message + ']', timestamp: Date.now() });
       renderConversationLog();

       addToHistory(cmd, 'ai-local', null);
     } finally {
        btn.disabled = false;
        btn.innerHTML = '✨';
      }
     }

     // ============================================================
      // Conversation Log Rendering (v1.5)
      // ============================================================
      function renderConversationLog() {
      var logEl = document.getElementById('awe-conversation-log');
      if (!logEl || conversationHistory.length === 0) return;
      logEl.innerHTML = '';
      for (var i = 0; i < conversationHistory.length; i++) {
        var msg = conversationHistory[i];
        var cls = msg.role === 'user' ? 'awe-message-user' : 'awe-message-assistant';
        var div = document.createElement('div');
        div.className = cls;
        // Truncate long messages for display
        var displayText = (msg.content || '').substring(0, 200);
        if ((msg.content || '').length > 200) displayText += '...';
        div.textContent = displayText;
        logEl.appendChild(div);
      }
      // Scroll to bottom
      logEl.scrollTop = logEl.scrollHeight;
      }

      function applyLocalModification(el, command) {
    var text = el.textContent?.trim();
    if (!text) return;
    var lower = command.toLowerCase();

    if (lower.includes('translate') && lower.includes('chinese')) {
      // Local translation placeholder — in production, use a real API
      el.textContent = '（AI翻译：' + text.substring(0, 30) + '）';
    } else if (lower.includes('shorter') || lower.includes('concise')) {
      var words = text.split(/\s+/).slice(0, Math.max(5, Math.floor(text.split(/\s+/).length / 2)));
      el.textContent = words.join(' ') + '...';
    } else if (lower.includes('longer') || lower.includes('detail')) {
      el.textContent = text + '. [This was expanded by AI Web Editor. Additional details and context would be added here.]';
    } else {
      // Default: wrap with styled span as visible modification
      var modified = '[AI-Modified] ' + text;
      if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) {
        el.textContent = modified;
      } else {
        el.innerHTML = '<span style="color:#6366f1;font-weight:600;">[AI]</span> ' + text;
      }
    }
  }

  // ============================================================
  // Style actions
  // ============================================================

  function applyStyleAction(action, el) {
    switch (action) {
      case 'setColor':
        el.style.color = document.getElementById('awe-style-color').value;
        break;
      case 'setBgColor':
        el.style.backgroundColor = document.getElementById('awe-style-bg').value;
        break;
      case 'setFontSize':
        el.style.fontSize = document.getElementById('awe-style-fontsize').value + 'px';
        break;
      case 'setFontWeight':
        el.style.fontWeight = document.getElementById('awe-style-fontweight').value;
        break;
      case 'setRadius':
        el.style.borderRadius = document.getElementById('awe-style-radius').value + 'px';
        break;
      case 'setOpacity':
        el.style.opacity = document.getElementById('awe-style-opacity').value;
        break;
      case 'setPadding':
        el.style.padding = document.getElementById('awe-style-padding').value + 'px';
        break;
      case 'setMargin':
        el.style.margin = document.getElementById('awe-style-margin').value + 'px';
        break;
    }
  }

  // ============================================================
  // History
  // ============================================================

  let historyStore = [];

  function addToHistory(command, type, data) {
    var entry = {
      command: command,
      type: type,
      data: data ? JSON.parse(data) : null,
      time: new Date().toLocaleTimeString(),
      elementTag: selectedElement?.tagName?.toLowerCase() || 'unknown',
      actionId: Date.now(),
    };
    historyStore.unshift(entry);
    if (historyStore.length > 20) historyStore.pop();
    renderHistory();
  }

  function renderHistory() {
    var container = document.getElementById('awe-history-list');
    if (!container) return;

    if (historyStore.length === 0) {
      container.innerHTML = '<p style="color:#64748b; font-size:13px; text-align:center; padding:20px 0;">No actions yet.</p>';
      return;
    }

    container.innerHTML = historyStore.map(function(h) {
      return '<div class="awe-history-item" data-action-id="' + h.actionId + '" data-type="' + h.type + '">' +
        '<div class="awe-history-command">' + escapeHtml(h.command) + '</div>' +
        '<div class="awe-history-time"><' + h.elementTag + '> · ' + h.time + '</div>' +
        '</div>';
    }).join('');

    // Attach click handlers for restore
    container.querySelectorAll('.awe-history-item').forEach(function(item) {
      item.addEventListener('click', function () {
        var id = parseInt(this.dataset.actionId);
        var entry = historyStore.find(function(h) { return h.actionId === id; });
        if (entry && entry.data) {
          // Re-apply the modification
          if (selectedElement) {
            if (entry.type === 'ai' && entry.data.newContent) {
              saveSnapshot(); // v1.1: save before restoring
              selectedElement.textContent = entry.data.newContent;
            }
          }
          showToast('Re-applied: ' + entry.command, 'success');
        } else {
          // For style actions, just re-select the element
          if (selectedElement) {
            highlightElement(selectedElement);
          }
        }
      });
    });
  }

  function restoreHistoryAction(actionId) {
    // Handled inline via data-action-id click above
  }

  // ============================================================
   // Status & Toast
   // ============================================================

   // ============================================================
   // Daily Usage Stats (v1.1)
   // ============================================================

   function updateUsageStats() {
     chrome.runtime.sendMessage({ action: 'get-daily-usage' }, function(response) {
       var el = document.getElementById('awe-usage-stats');
       if (!el || !response) return;
       el.textContent = "Today: " + response.count + "/" + response.limit + " uses";
     });
   }

   // ============================================================
   // Status & Toast
   // ============================================================

  function showStatus(msg, type) {
    var el = document.getElementById('awe-status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = '';
    if (type) el.classList.add(type);
    el.classList.add('visible');
    setTimeout(function() { el.classList.remove('visible'); }, 4000);
  }

  function showToast(msg, type) {
    var toast = document.getElementById('awe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'awe-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    if (type === 'success') toast.style.borderColor = '#22c55e';
    else toast.style.borderColor = '#6366f1';
    setTimeout(function() { toast.classList.remove('visible'); }, 2500);
  }

  // ============================================================
  // Helpers
  // ============================================================

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
    var match = rgb.match(/(\d+)/g);
    if (!match || match.length < 3) return null;
    return '#' + match.slice(0, 3).map(function(x) {
      var hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

 function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // Context Menu Submenu (v1.3) — "Quick Edit with AI Web Editor"
  // ============================================================
  function createContextMenu() {
    var menu = document.createElement('div');
    menu.id = 'awe-context-menu';
    menu.style.cssText = 'display:none; position:fixed; z-index:2147483647; background:#1a1a2e; border:1px solid #2d2d4a; border-radius:8px; padding:4px; min-width:200px; box-shadow:0 8px 24px rgba(0,0,0,0.5);';
    menu.innerHTML = `
      <div style="padding:6px 12px; font-size:13px; color:#e2e8f0; font-weight:600;">✦ AI Web Editor</div>
      <div style="border-top:1px solid #2d2d4a; margin:4px 0;"></div>
      <button id="awe-ctx-select" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">🎯 Select & Edit</button>
      <button id="awe-ctx-translate" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">🌐 Translate to Chinese</button>
      <button id="awe-ctx-simplify" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">📝 Simplify</button>
      <button id="awe-ctx-longer" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">📄 Make Longer</button>
      <button id="awe-ctx-shorter" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">✂️ Make Shorter</button>
      <button id="awe-ctx-professional" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">💼 Professional Tone</button>
      <div style="border-top:1px solid #2d2d4a; margin:4px 0;"></div>
      <button id="awe-ctx-html" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">📋 Copy HTML</button>
      <button id="awe-ctx-css" style="width:100%;padding:8px 12px;background:none;border:none;color:#e2e8f0;text-align:left;font-size:13px;border-radius:4px;cursor:pointer;">🎨 Get CSS</button>
    `;
    document.body.appendChild(menu);

    // Position menu at click coordinates
    menu.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // Close on any other click
    document.addEventListener('click', function() { menu.style.display = 'none'; });

    // Menu item clicks — select the element and apply action
    var actions = {
      'awe-ctx-select': 'select',
      'awe-ctx-translate': 'translate',
      'awe-ctx-simplify': 'simplify',
      'awe-ctx-longer': 'longer',
      'awe-ctx-shorter': 'shorter',
      'awe-ctx-professional': 'professional',
      'awe-ctx-html': 'html-copy',
      'awe-ctx-css': 'css-export',
    };

    Object.keys(actions).forEach(function(btnId) {
      document.getElementById(btnId).addEventListener('click', function(e) {
        e.stopPropagation();
        menu.style.display = 'none';
        // Target is the element at the contextmenu click position
        var targetEl = document.elementFromPoint(e.clientX, e.clientY);
        if (!targetEl || targetEl.closest('#awe-context-menu') || targetEl.closest('#awe-editor-panel')) return;

        selectedElement = targetEl;
        highlightElement(targetEl);

        var action = actions[btnId];
        if (action === 'select') {
          openPanel();
          updatePreview(targetEl);
        } else if (action === 'translate') {
          saveSnapshot();
          targetEl.textContent = '[AI-Translated] ' + targetEl.textContent;
          addToHistory('Translate to Chinese', 'ai-local', null);
          showToast('Translation applied!', 'success');
        } else if (action === 'simplify') {
          applyLocalModification(targetEl, 'simplify text');
          addToHistory('Simplify', 'ai-local', null);
          showToast('Simplified!', 'success');
        } else if (action === 'longer') {
          applyLocalModification(targetEl, 'make longer');
          addToHistory('Make Longer', 'ai-local', null);
          showToast('Expanded!', 'success');
        } else if (action === 'shorter') {
          applyLocalModification(targetEl, 'make shorter');
          addToHistory('Make Shorter', 'ai-local', null);
          showToast('Shortened!', 'success');
        } else if (action === 'professional') {
          applyLocalModification(targetEl, 'rewrite in professional tone');
          addToHistory('Professional Tone', 'ai-local', null);
          showToast('Rewritten professionally!', 'success');
        } else if (action === 'html-copy') {
          navigator.clipboard.writeText(targetEl.outerHTML);
          showToast('HTML copied!', 'success');
        } else if (action === 'css-export') {
          var cs = window.getComputedStyle(targetEl);
          var css = targetEl.tagName.toLowerCase() + ' {\n';
          for (var i = 0; i < cs.length; i++) {
            var prop = cs[i];
            if (prop.startsWith('-webkit') || prop === 'content' || prop === 'all') continue;
            var val = cs.getPropertyValue(prop);
            css += '  ' + prop + ': ' + val + ';\n';
          }
          css += '}';
          navigator.clipboard.writeText(css);
          showToast('CSS copied!', 'success');
        }
      });
    });

    // Show menu on right-click on page elements
    document.addEventListener('contextmenu', function(e) {
      if (e.target.closest('#awe-context-menu') || e.target.closest('#awe-editor-panel')) return;
      var targetEl = e.target;
      if (!targetEl || targetEl.closest('#awe-trigger-btn') || targetEl.closest('#awe-selection-overlay')) return;

      // Show context menu at mouse position, but not if inside our own UI
      e.preventDefault();
      var menu = document.getElementById('awe-context-menu');
      menu.style.display = 'block';
      menu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 350) + 'px';
    });
  }

  // ============================================================
  // Keyboard shortcuts (v1.1: added Undo/Redo)
  // ============================================================

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isSelectingMode) {
        toggleSelectMode();
      } else if (isOpen) {
        closePanel();
      }
    }
    // Ctrl+Z = Undo (not with Shift)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z = Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
       redo();
       return;
      }
      // v1.5: Enter in command input sends message (Shift+Enter for newline)
      if (e.target.id === 'awe-command-input' && e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleAICommand();
       return;
      }
      });

   // ============================================================
    // Template Application (v1.5) — from popup via background relay
    // ============================================================

    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      if (message.action === 'apply-template' && message.prompt && selectedElement) {
        document.getElementById('awe-command-input').value = message.prompt;
        // Switch to AI tab
        document.querySelectorAll('.awe-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.awe-tab-panel').forEach(function(p) { p.classList.remove('active'); });
        document.querySelector('.awe-tab-btn[data-tab="ai"]').classList.add('active');
        document.getElementById('tab-ai').classList.add('active');
        if (!isOpen) openPanel();
        sendResponse({ success: true });
      }
    });

    // ============================================================
    // Initialize
    // ============================================================

  createTriggerBtn();
  createOverlay();
  createEditorPanel();

  // Apply saved theme (v1.1)
    applyTheme(currentTheme);

    // Load daily usage stats (v1.1)
    updateUsageStats();

   // Create context menu (v1.3)
   createContextMenu();

  })();
