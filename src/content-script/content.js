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
  // Create and inject all DOM elements
  // ============================================================

  function createTriggerBtn() {
    const btn = document.createElement('button');
    btn.id = 'awe-trigger-btn';
    btn.innerHTML = '✦';
    btn.title = 'AI Web Editor — Click to select element';
    btn.addEventListener('click', toggleSelectMode);
    document.body.appendChild(btn);
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'awe-selection-overlay';
    overlay.addEventListener('click', handleElementClick);
    overlay.addEventListener('mouseenter', handleElementHover);
    document.body.appendChild(overlay);
  }

  function createEditorPanel() {
    const panel = document.createElement('div');
    panel.id = 'awe-editor-panel';
    panel.innerHTML = `
      <div id="awe-panel-header">
        <h3>✦ AI Web Editor</h3>
        <button id="awe-close-btn" title="Close">×</button>
      </div>
      <div id="awe-element-preview">
        <span id="awe-element-tag">&lt;div&gt;</span>
        <div id="awe-element-text">Click an element to select it</div>
      </div>
      <div id="awe-tabs">
        <button class="awe-tab-btn active" data-tab="ai">AI Modify</button>
        <button class="awe-tab-btn" data-tab="style">Style</button>
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
          </div>
          <textarea id="awe-command-input" placeholder="Tell AI how to modify this element...&#10;e.g. 'Rewrite this title to be more catchy' or 'Translate to Chinese'"></textarea>
          <button id="awe-send-btn">✨ Apply AI Modification</button>
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
        <!-- History Tab -->
        <div class="awe-tab-panel" id="tab-history">
          <div id="awe-history-list">
            <p style="color:#64748b; font-size:13px; text-align:center; padding:20px 0;">No actions yet. Select an element and try AI or Style edits.</p>
          </div>
        </div>
      </div>
      <div id="awe-status-msg"></div>
    `;
    document.body.appendChild(panel);
  }

  // ============================================================
  // Element selection logic
  // ============================================================

  function toggleSelectMode() {
    const overlay = document.getElementById('awe-selection-overlay');
    const btn = document.getElementById('awe-trigger-btn');

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
    let target = e.target;

    // Skip our own elements
    if (target.closest('#awe-trigger-btn') || target.closest('#awe-selection-overlay') || target.closest('#awe-editor-panel')) return;

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
    let target = e.target;
    if (target.closest('#awe-trigger-btn') || target.closest('#awe-editor-panel')) return;
    clearHighlight();
    highlightElement(target);
  }

  function highlightElement(el) {
    clearHighlight();
    el.classList.add('awe-element-highlight');
  }

  function clearHighlight() {
    document.querySelectorAll('.awe-element-highlight').forEach((el) => {
      el.classList.remove('awe-element-highlight');
    });
  }

  function updatePreview(el) {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().substring(0, 120);
    document.getElementById('awe-element-tag').textContent = `<${tag}>`;
    document.getElementById('awe-element-text').textContent = text + (text.length >= 120 ? '...' : '');

    // Pre-populate style tab with current values
    const computed = window.getComputedStyle(el);
    document.getElementById('awe-style-color').value = rgbToHex(computed.color) || '#000000';
    document.getElementById('awe-style-bg').value = rgbToHex(computed.backgroundColor) || '#ffffff';
    document.getElementById('awe-style-fontsize').value = parseInt(computed.fontSize) || 16;
    document.getElementById('awe-style-fontweight').value = computed.fontWeight || 'normal';
    document.getElementById('awe-style-radius').value = parseInt(computed.borderRadius) || 0;
    document.getElementById('awe-style-opacity').value = parseFloat(computed.opacity) || 1;
    document.getElementById('awe-style-padding').value = parseInt(computed.padding) || 0;
    document.getElementById('awe-style-margin').value = parseInt(computed.margin) || 0;
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

    // Tab buttons
    const tabBtn = e.target.closest('.awe-tab-btn');
    if (tabBtn) {
      document.querySelectorAll('.awe-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.awe-tab-panel').forEach((p) => p.classList.remove('active'));
      tabBtn.classList.add('active');
      const tabId = 'tab-' + tabBtn.dataset.tab;
      document.getElementById(tabId).classList.add('active');
      return;
    }

    // Quick command buttons
    const quickBtn = e.target.closest('.awe-quick-btn');
    if (quickBtn && selectedElement) {
      const cmd = quickBtn.dataset.cmd;
      const commands = {
        'rewrite': 'Rewrite this content to be more engaging and clear.',
        'simplify': 'Simplify the text so it is easier to understand.',
        'translate': 'Translate this text to Chinese (简体中文).',
        'longer': 'Expand and make this content longer and more detailed.',
        'shorter': 'Make this content much shorter and concise.',
        'tone-professional': 'Rewrite in a professional, formal tone.',
        'funnier': 'Make this content funnier and more entertaining.',
      };
      document.getElementById('awe-command-input').value = commands[cmd] || '';
      // Switch to AI tab
      document.querySelectorAll('.awe-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.awe-tab-panel').forEach((p) => p.classList.remove('active'));
      document.querySelector('.awe-tab-btn[data-tab="ai"]').classList.add('active');
      document.getElementById('tab-ai').classList.add('active');
      return;
    }

    // Style apply buttons
    const styleBtn = e.target.closest('[data-action]');
    if (styleBtn && selectedElement) {
      const action = styleBtn.dataset.action;
      applyStyleAction(action, selectedElement);
      showToast('Style applied!', 'success');
      return;
    }

    // Send button
    if (e.target.id === 'awe-send-btn') {
      handleAICommand();
      return;
    }

    // History items click
    const historyItem = e.target.closest('.awe-history-item');
    if (historyItem) {
      const action = historyItem.dataset.action;
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

    const cmd = document.getElementById('awe-command-input').value.trim();
    if (!cmd) {
      showStatus('Please enter a command.', 'error');
      return;
    }

    const btn = document.getElementById('awe-send-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="awe-spinner"></span> Processing...';
    showStatus('Sending to AI...', '');

    try {
      // Try sending through service worker (which forwards to API)
      const response = await chrome.runtime.sendMessage({
        action: 'ai-modify',
        command: cmd,
        elementText: selectedElement.textContent?.trim() || '',
        elementTag: selectedElement.tagName?.toLowerCase() || 'div',
      });

      if (response.success && response.newContent) {
        // For text content modifications
        if (selectedElement.childNodes.length === 0 || (selectedElement.childNodes.length === 1 && selectedElement.firstChild.nodeType === Node.TEXT_NODE)) {
          selectedElement.textContent = response.newContent;
        } else {
          // For complex elements, try innerText replacement on first text node
          const walker = document.createTreeWalker(selectedElement, NodeFilter.SHOW_TEXT);
          let firstText = walker.nextNode();
          if (firstText) {
            firstText.textContent = response.newContent;
          } else {
            // Fallback: create a new span with the content
            const span = document.createElement('span');
            span.innerHTML = response.newContent;
            selectedElement.innerHTML = '';
            selectedElement.appendChild(span);
          }
        }
        showStatus('AI modification applied!', 'success');
        addToHistory(cmd, 'ai', JSON.stringify({ newContent: response.newContent }));
      } else {
        // API not configured or failed — show local fallback
        applyLocalModification(selectedElement, cmd);
        showStatus('API not connected. Applied local modification.', '');
        addToHistory(cmd, 'ai-local', null);
      }
    } catch (err) {
      console.error('[AI Web Editor] Error:', err);
      // Local fallback
      applyLocalModification(selectedElement, cmd);
      showStatus('API not available. Applied local modification.', '');
      addToHistory(cmd, 'ai-local', null);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Apply AI Modification';
    }
  }

  function applyLocalModification(el, command) {
    const text = el.textContent?.trim();
    if (!text) return;
    const lower = command.toLowerCase();

    if (lower.includes('translate') && lower.includes('chinese')) {
      // Local translation placeholder — in production, use a real API
      el.textContent = '（AI翻译：' + text.substring(0, 30) + '）';
    } else if (lower.includes('shorter') || lower.includes('concise')) {
      const words = text.split(/\s+/).slice(0, Math.max(5, Math.floor(text.split(/\s+/).length / 2)));
      el.textContent = words.join(' ') + '...';
    } else if (lower.includes('longer') || lower.includes('detail')) {
      el.textContent = text + '. [This was expanded by AI Web Editor. Additional details and context would be added here.]';
    } else {
      // Default: wrap with styled span as visible modification
      const modified = '[AI-Modified] ' + text;
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
    const entry = {
      command,
      type,
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
    const container = document.getElementById('awe-history-list');
    if (!container) return;

    if (historyStore.length === 0) {
      container.innerHTML = '<p style="color:#64748b; font-size:13px; text-align:center; padding:20px 0;">No actions yet.</p>';
      return;
    }

    container.innerHTML = historyStore.map((h) => `
      <div class="awe-history-item" data-action-id="${h.actionId}" data-type="${h.type}">
        <div class="awe-history-command">${escapeHtml(h.command)}</div>
        <div class="awe-history-time"><${h.elementTag}> · ${h.time}</div>
      </div>
    `).join('');

    // Attach click handlers for restore
    container.querySelectorAll('.awe-history-item').forEach((item) => {
      item.addEventListener('click', function () {
        const id = parseInt(this.dataset.actionId);
        const entry = historyStore.find((h) => h.actionId === id);
        if (entry && entry.data) {
          // Re-apply the modification
          if (selectedElement) {
            if (entry.type === 'ai' && entry.data.newContent) {
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

  function showStatus(msg, type) {
    const el = document.getElementById('awe-status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = '';
    if (type) el.classList.add(type);
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 4000);
  }

  function showToast(msg, type) {
    let toast = document.getElementById('awe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'awe-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    if (type === 'success') toast.style.borderColor = '#22c55e';
    else toast.style.borderColor = '#6366f1';
    setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  // ============================================================
  // Helpers
  // ============================================================

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
    const match = rgb.match(/(\d+)/g);
    if (!match || match.length < 3) return null;
    return '#' + match.slice(0, 3).map((x) => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // Keyboard shortcut: Escape to deselect/close
  // ============================================================

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isSelectingMode) {
        toggleSelectMode();
      } else if (isOpen) {
        closePanel();
      }
    }
  });

  // ============================================================
  // Initialize
  // ============================================================

  createTriggerBtn();
  createOverlay();
  createEditorPanel();

})();
