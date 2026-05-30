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
        // Element Selector History (v1.8)
        // ============================================================
        var selectedElementHistory = []; // [{tagName, className, textContent, selector, timestamp}]
        var _historyDropdownOpen = false;

        function loadElementHistory() {
          chrome.storage.sync.get(['selectedElementHistory'], function(result) {
            if (result.selectedElementHistory && Array.isArray(result.selectedElementHistory)) {
              selectedElementHistory = result.selectedElementHistory.slice(0, 10);
            } else {
              selectedElementHistory = [];
            }
          });
        }

        function saveElementHistory() {
          chrome.storage.sync.set({ selectedElementHistory: selectedElementHistory.slice(0, 10) }, function() {
            renderElementHistoryDropdown();
          });
        }

        function buildSelector(el) {
          if (!el) return '';
          var parts = [];
          var current = el;
          var depth = 0;
          while (current && current.nodeType === Node.ELEMENT_NODE && depth < 6) {
            var tag = current.tagName.toLowerCase() || '';
            var cls = (current.className && typeof current.className === 'string') ? current.className.trim().split(/\s+/).filter(Boolean)[0] : '';
            var id = current.id || '';
            if (id) {
              parts.unshift('#' + id);
              break;
            } else if (cls) {
              parts.unshift(tag + '.' + cls);
            } else {
              parts.unshift(tag);
            }
            current = current.parentElement;
            depth++;
          }
          return parts.join(' > ');
        }

        function recordSelectedElement(el) {
          if (!el) return;
          var tagName = (el.tagName || '').toLowerCase();
          var className = '';
          if (el.className && typeof el.className === 'string') {
            className = el.className.trim().split(/\s+/).filter(Boolean).join('.');
          }
          var textContent = (el.textContent || '').trim().substring(0, 50);
          var selector = buildSelector(el);

          var entry = {
            tagName: tagName,
            className: className,
            textContent: textContent,
            selector: selector,
            timestamp: Date.now()
          };

          // Remove if already exists (re-insert at front)
          selectedElementHistory = selectedElementHistory.filter(function(h) {
            return h.selector !== entry.selector;
          });

          // Add to front
          selectedElementHistory.unshift(entry);

          // Keep only 10
          if (selectedElementHistory.length > 10) {
            selectedElementHistory = selectedElementHistory.slice(0, 10);
          }

          saveElementHistory();
        }

        function restoreFromHistory(selector) {
          try {
            var el = document.querySelector(selector);
            if (el && !el.closest('#awe-editor-panel') && !el.closest('#awe-selection-overlay') && !el.closest('#awe-trigger-btn')) {
              selectedElement = el;
              highlightElement(el);
              updatePreview(el);
              openPanel();
              showToast('Restored element: <' + el.tagName.toLowerCase() + '>', 'success');
            } else {
              // Try fallback: use className as querySelector
              var parts = selector.split(/\s+/);
              for (var i = 0; i < parts.length; i++) {
                if (parts[i].includes('.')) {
                  el = document.querySelector(parts[i]);
                  break;
                }
              }
              if (el && !el.closest('#awe-editor-panel') && !el.closest('#awe-selection-overlay')) {
                selectedElement = el;
                highlightElement(el);
                updatePreview(el);
                openPanel();
                showToast('Restored element: <' + el.tagName.toLowerCase() + '>', 'success');
              } else {
                showToast('Could not find this element anymore.', 'error');
              }
            }
          } catch (err) {
            showToast('Selector error: ' + err.message, 'error');
          }
        }

        function renderElementHistoryDropdown() {
          if (!selectedElementHistory || selectedElementHistory.length === 0) return;

          var btn = document.getElementById('awe-element-history-btn');
          if (!btn) return;

          var listEl = document.getElementById('awe-element-history-list');
          if (!listEl) return;

          var html = '';
          for (var i = 0; i < selectedElementHistory.length; i++) {
            var h = selectedElementHistory[i];
            var displayText = h.textContent || '(empty)';
            if (displayText.length > 40) displayText = displayText.substring(0, 40) + '...';
            var classLabel = h.className ? '.' + h.className : '';
            html += '<div class="awe-history-entry" data-index="' + i + '" title="' + escapeHtml(h.selector) + '">' +
              '<span class="awe-history-entry-tag">&lt;' + h.tagName + '&gt;</span>' +
              '<span class="awe-history-entry-class">' + escapeHtml(classLabel) + '</span>' +
              '<span class="awe-history-entry-text">"' + escapeHtml(displayText) + '"</span>' +
              '</div>';
          }
          listEl.innerHTML = html;

          // Attach click handlers
          listEl.querySelectorAll('.awe-history-entry').forEach(function(entry) {
            entry.addEventListener('click', function(e) {
              e.stopPropagation();
              var idx = parseInt(this.dataset.index);
              if (selectedElementHistory[idx]) {
                restoreFromHistory(selectedElementHistory[idx].selector);
                toggleHistoryDropdown(false); // close dropdown
              }
            });
          });
        }

        function toggleHistoryDropdown(forceState) {
          var btn = document.getElementById('awe-element-history-btn');
          var listEl = document.getElementById('awe-element-history-list');
          if (!btn || !listEl) return;

          var isOpen = forceState !== undefined ? forceState : !_historyDropdownOpen;
          _historyDropdownOpen = isOpen;

          if (isOpen) {
            // Position dropdown below the button
            var rect = btn.getBoundingClientRect();
            listEl.style.left = rect.left + 'px';
            listEl.style.top = (rect.bottom + 4) + 'px';
            listEl.style.display = 'block';
          } else {
            listEl.style.display = 'none';
          }
        }

        // Clear element history
        function clearElementHistory() {
          selectedElementHistory = [];
          chrome.storage.sync.remove('selectedElementHistory', function() {});
          renderElementHistoryDropdown();
          toggleHistoryDropdown(false);
          showToast('Element history cleared.', 'success');
        }

     // ============================================================
        // Conversation Mode (v1.5)
        // ============================================================
        var conversationHistory = []; // [{role: 'user' | 'assistant', content: string}]

       // ============================================================
       // Diff Preview System (v1.7)
       // ============================================================
       var diffPendingElement = null;   // DOM element waiting for user confirm
       var diffPendingNewContent = null;  // AI-proposed new content string
       var diffPendingOldContent = null;  // original text before modification

       function clearDiffPreview() {
         var panel = document.getElementById('awe-diff-preview-panel');
         if (panel) panel.classList.remove('active');
         diffPendingElement = null;
         diffPendingNewContent = null;
         diffPendingOldContent = null;
       }

       // Simple word-level diff: returns an array of { type: 'same'|'del'|'ins', value: string }
       function computeWordDiff(oldText, newText) {
         var oldWords = (oldText || '').split(/(\s+)/);
         var newWords = (newText || '').split(/(\s+)/);
         // LCS-based word diff (simple dynamic programming for short texts)
         var m = oldWords.length;
         var n = newWords.length;
         if (m === 0 && n === 0) return [];
         if (n === 0) {
           return oldWords.map(function(w) { return { type: 'del', value: w }; });
         }
         if (m === 0) {
           return newWords.map(function(w) { return { type: 'ins', value: w }; });
         }

         // Build LCS table (limited to short texts for performance)
         var maxDim = Math.min(m, n, 200);
         var lcs = [];
         for (var i = 0; i <= maxDim; i++) {
           lcs[i] = [];
           for (var j = 0; j <= maxDim; j++) {
             if (i === 0 || j === 0) lcs[i][j] = 0;
             else if (oldWords[i - 1] === newWords[j - 1]) lcs[i][j] = lcs[i - 1][j - 1] + 1;
             else lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
           }
         }

         // Backtrack to produce diff ops
         var result = [];
         var i = m, j = n;
         while (i > 0 || j > 0) {
           if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
             // Check bounds for LCS table access
             var ci = Math.min(i, maxDim);
             var cj = Math.min(j, maxDim);
             if (lcs[ci][cj] === lcs[ci - 1 ? ci - 1 : 0][cj - 1 ? cj - 1 : 0] + 1) {
               result.unshift({ type: 'same', value: oldWords[i - 1] });
               i--; j--;
               continue;
             }
           }
           if (j > 0 && (i === 0 || (lcs[Math.min(i, maxDim)][Math.min(j - 1, maxDim)] >= lcs[Math.min(i - 1 ? i - 1 : 0, maxDim)][Math.min(j, maxDim)]))) {
             result.unshift({ type: 'ins', value: newWords[j - 1] });
             j--;
           } else if (i > 0) {
             result.unshift({ type: 'del', value: oldWords[i - 1] });
             i--;
           } else {
             break;
           }
         }
         return result;
       }

       // Render a diff ops array into HTML markup
       function renderDiffHTML(diffOps) {
         var html = '';
         var hasChanges = false;
         for (var i = 0; i < diffOps.length; i++) {
           var op = diffOps[i];
           if (op.type === 'del') {
             html += '<mark class="awe-diff-delete">' + escapeHtml(op.value) + '</mark>';
             hasChanges = true;
           } else if (op.type === 'ins') {
             html += '<mark class="awe-diff-insert">' + escapeHtml(op.value) + '</mark>';
             hasChanges = true;
           } else {
             html += escapeHtml(op.value);
           }
         }
         return { html: html, hasChanges: hasChanges };
       }

       // Build the diff preview panel and show it
       function showDiffPreview(oldContent, newContent, targetElement) {
         var oldDisplay = (oldContent || '').trim();
         var newDisplay = (newContent || '').trim();

         // If both are very short (<10 words), use inline word diff
         var isShort = oldDisplay.split(/\s+/).length < 10 && newDisplay.split(/\s+/).length < 10;
         var diffResult, rendered;

         if (isShort) {
           diffResult = computeWordDiff(oldDisplay, newDisplay);
           rendered = renderDiffHTML(diffResult);
         } else {
           // For longer texts, use line-based diff
           var oldLines = oldDisplay.split('\n');
           var newLines = newDisplay.split('\n');
           var lcsSize = Math.min(oldLines.length, newLines.length, 100);
           var lcsTable = [];
           for (var i = 0; i <= lcsSize; i++) {
             lcsTable[i] = [];
             for (var j = 0; j <= lcsSize; j++) {
               if (i === 0 || j === 0) lcsTable[i][j] = 0;
               else if (oldLines[i - 1] === newLines[j - 1]) lcsTable[i][j] = lcsTable[i - 1][j - 1] + 1;
               else lcsTable[i][j] = Math.max(lcsTable[i - 1][j], lcsTable[i][j - 1]);
             }
           }
           // Backtrack
           var diffOps = [];
           var oi = oldLines.length, ni = newLines.length;
           while (oi > 0 || ni > 0) {
             if (oi > 0 && ni > 0 && oldLines[oi - 1] === newLines[ni - 1]) {
               diffOps.unshift({ type: 'same', value: oldLines[oi - 1] });
               oi--; ni--;
             } else if (ni > 0 && (oi === 0 || lcsTable[Math.min(oi, lcsSize)][Math.max(ni - 1, 0)] >= lcsTable[Math.max(oi - 1, 0)][Math.min(ni, lcsSize)])) {
               diffOps.unshift({ type: 'ins', value: newLines[ni - 1] });
               ni--;
             } else if (oi > 0) {
               diffOps.unshift({ type: 'del', value: oldLines[oi - 1] });
               oi--;
             } else { break; }
           }
           rendered = renderDiffHTML(diffOps);
         }

         // Build panel HTML only if there are actual changes
         var bodyHtml = '';
         if (rendered.hasChanges) {
           // Show old content with deletions highlighted
           var oldHtml = '<div class="diff-section-label diff-old-label">Original</div>';
           if (isShort || oldDisplay.split('\n').length <= 15) {
             oldHtml += '<div class="diff-text-wrap">' + rendered.html + '</div>';
           } else {
             // For long text, show full-line diff
             var lineHtml = '';
             for (var i = 0; i < diffOps.length; i++) {
               var dOp = diffOps[i];
               if (dOp.type === 'del') {
                 lineHtml += '<span class="diff-deleted-line">' + escapeHtml(dOp.value) + '</span>';
               } else if (dOp.type === 'ins') {
                 lineHtml += '<span class="diff-inserted-line">' + escapeHtml(dOp.value) + '</span>';
               } else {
                 lineHtml += '<span class="diff-unchanged">' + escapeHtml(dOp.value) + '</span>';
               }
             }
             oldHtml += '<div class="diff-text-wrap">' + lineHtml + '</div>';
           }

           // Show new content with insertions highlighted
           var newHtml = '<div class="diff-section-label diff-new-label">New Content</div>';
           if (isShort || newDisplay.split('\n').length <= 15) {
             newHtml += '<div class="diff-text-wrap">' + rendered.html + '</div>';
           } else {
             var lineHtml2 = '';
             for (var i = 0; i < diffOps.length; i++) {
               var dOp2 = diffOps[i];
               if (dOp2.type === 'del') {
                 lineHtml2 += '<span class="diff-deleted-line">' + escapeHtml(dOp2.value) + '</span>';
               } else if (dOp2.type === 'ins') {
                 lineHtml2 += '<span class="diff-inserted-line">' + escapeHtml(dOp2.value) + '</span>';
               } else {
                 lineHtml2 += '<span class="diff-unchanged">' + escapeHtml(dOp2.value) + '</span>';
               }
             }
             newHtml += '<div class="diff-text-wrap">' + lineHtml2 + '</div>';
           }

           bodyHtml = oldHtml + newHtml;
         } else {
           bodyHtml = '<p style="color:#94a3b8;text-align:center;padding:16px 0;">No changes detected in the content.</p>';
         }

         var panel = document.getElementById('awe-diff-preview-panel');
         if (!panel) {
           panel = document.createElement('div');
           panel.id = 'awe-diff-preview-panel';
           panel.innerHTML = '<div id="awe-diff-header"><h3>✦ AI Diff Preview</h3><button id="awe-diff-close-btn">×</button></div><div id="awe-diff-body">' + bodyHtml + '</div><div id="awe-diff-footer"><button id="awe-diff-discard-btn">Discard</button><button id="awe-diff-apply-btn">Apply Changes</button></div>';
           document.body.appendChild(panel);
         } else {
           panel.querySelector('#awe-diff-body').innerHTML = bodyHtml;
         }

         // Store pending data
         diffPendingElement = targetElement;
         diffPendingNewContent = newContent;
         diffPendingOldContent = oldDisplay;

         panel.classList.add('active');

         // Remove old listeners to avoid duplicates
         var applyBtn = document.getElementById('awe-diff-apply-btn');
         var discardBtn = document.getElementById('awe-diff-discard-btn');
         var closeBtn = document.getElementById('awe-diff-close-btn');
         if (applyBtn) {
           var newApplyBtn = applyBtn.cloneNode(true);
           applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
           newApplyBtn.addEventListener('click', function(e) { e.stopPropagation(); applyDiffPreview(); });
         }
         if (discardBtn) {
           var newDiscardBtn = discardBtn.cloneNode(true);
           discardBtn.parentNode.replaceChild(newDiscardBtn, discardBtn);
           newDiscardBtn.addEventListener('click', function(e) { e.stopPropagation(); discardDiffPreview(); });
         }
         if (closeBtn) {
           var newCloseBtn = closeBtn.cloneNode(true);
           closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
           newCloseBtn.addEventListener('click', function(e) { e.stopPropagation(); discardDiffPreview(); });
         }

         showStatus('Review changes below. Click Apply or Discard.', '');
       }

       // User confirmed: apply the diff to DOM
       function applyDiffPreview() {
         if (!diffPendingElement || !diffPendingNewContent) return;
         var el = diffPendingElement;
         var newContent = diffPendingNewContent;
         clearDiffPreview();

         if (el.childNodes.length === 0 || (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE)) {
           el.textContent = newContent;
         } else {
           var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
           var firstText = walker.nextNode();
           if (firstText) { firstText.textContent = newContent; }
           else {
             var span = document.createElement('span');
             span.innerHTML = newContent;
             el.innerHTML = '';
             el.appendChild(span);
           }
         }

         updatePreview(el);
         showStatus('AI modification applied!', 'success');
       }

       // User rejected: restore old content via undo snapshot
       function discardDiffPreview() {
         clearDiffPreview();
         // Restore the element to its state before AI change (undo)
         if (undoStack.length > 0 && diffPendingElement) {
           var lastEntry = undoStack.pop();
           if (lastEntry) diffPendingElement.innerHTML = lastEntry.html;
           updatePreview(diffPendingElement);
         }
         showStatus('Changes discarded.', '');
       }

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
           await new Promise(function(resolve) {
             chrome.runtime.sendMessage({
               action: 'ai-modify',
               command: cmd,
               elementText: el.textContent?.trim() || '',
               elementTag: el.tagName?.toLowerCase() || 'div',
             }, function(response) {
               // v1.7: show diff preview for batch items too
               if (response && response.success && response.newContent) {
                 var oldText = response.oldContent || (el.textContent?.trim() || '');
                 saveSnapshot();
                 showDiffPreview(oldText, response.newContent, el);
               }
               resolve(response);
             });
           });
         } catch (err) { console.error('[Batch] Error on element ' + (i+1) + ':', err); }
         // Delay between requests to avoid rate limiting
         await new Promise(function(r) { setTimeout(r, 200); });
       }
       showStatus('Applied to all ' + batchSelectedElements.length + ' elements! Review in diff panel.', 'success');
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
             <button id="awe-element-history-btn" title="Element Selection History">◰</button>
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

           <!-- CSS Rules Sub-section (v1.6) -->
           <div id="css-rules-panel" style="margin-top:12px; padding-top:12px; border-top:1px solid #2d2d4a;">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
               <label style="font-size:12px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin:0;">CSS Rules</label>
               <button id="css-rules-apply-all-btn" class="awe-apply-btn" style="padding:4px 12px; font-size:11px;">Apply All</button>
             </div>
             <div id="css-rules-list-content" style="max-height:120px; overflow-y:auto;"></div>
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
        <!-- Element History Dropdown -->
        <div id="awe-element-history-list" style="display:none; position:absolute; z-index:2147483647; background:#1a1a2e; border:1px solid #2d2d4a; border-radius:8px; padding:4px 0; min-width:280px; box-shadow:0 8px 24px rgba(0,0,0,0.5); max-height:360px; overflow-y:auto;"></div>
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
      recordSelectedElement(target);
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

      // Element History button — toggle dropdown
       if (e.target.id === 'awe-element-history-btn') {
         e.stopPropagation();
         toggleHistoryDropdown();
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

       // Refresh CSS rules when Style tab is opened (v1.6)
       if (tabBtn.dataset.tab === 'style') {
         refreshCssRulesPanel();
       }
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
             // Translations (v1.2) — use English instructions for universal AI processing
              'translate-es': 'Translate this text to Spanish.',
              'translate-fr': 'Translate this text to French.',
              'translate-ja': 'Translate this text to Japanese.',
              'translate-ko': 'Translate this text to Korean.',
              'translate-de': 'Translate this text to German.',
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

             // v1.7: Show diff preview instead of direct apply
             var oldText = response.oldContent || (selectedElement.textContent?.trim() || '');
             showDiffPreview(oldText, response.newContent, selectedElement);

             // v1.5: Update conversation history and render log
             conversationHistory.push({ role: 'user', content: cmd, timestamp: Date.now() });
             conversationHistory.push({ role: 'assistant', content: response.newContent, newContent: response.newContent, timestamp: Date.now() });
             renderConversationLog();

             addToHistory(cmd, 'ai-pending', JSON.stringify({ newContent: response.newContent, oldContent: oldText }));
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
   // Quick Translate Overlay Bubble (v1.9)
   // ============================================================
   var translateBubble = null;       // The bubble DOM element
   var translateTargetEl = null;     // The element whose text was selected
   var translateOriginalText = '';   // Original text before translation
   var translateCurrentResult = '';  // Current translation result
   var translateHoverTimer = null;   // Delayed hide timer
   var _translateBubbleActive = false;

   function createTranslateBubble() {
     if (translateBubble) return;
     translateBubble = document.createElement('div');
     translateBubble.id = 'awe-translate-bubble';
     translateBubble.innerHTML = '\
       <div class="awe-tb-header">\
         <p class="awe-tb-source-text"></p>\
       </div>\
       <div class="awe-tb-body">\
         <div class="awe-tb-translation-label">Translation</div>\
         <p class="awe-tb-translation-text"></p>\
       </div>\
       <div class="awe-tb-loading">\
         <span class="awe-spinner"></span> Translating...\
       </div>\
       <div class="awe-tb-actions">\
         <button class="awe-tb-btn awe-tb-btn-translate-zh" id="awe-tb-trans-zh">🌐 Translate to Chinese</button>\
         <button class="awe-tb-btn awe-tb-btn-translate-other" id="awe-tb-lang-picker">📝 Other Languages</button>\
       </div>\
       <div class="awe-tb-lang-selector">\
         <button class="awe-tb-lang-btn" data-lang="English">EN</button>\
         <button class="awe-tb-lang-btn" data-lang="Japanese">日本語</button>\
         <button class="awe-tb-lang-btn" data-lang="Korean">한국어</button>\
         <button class="awe-tb-lang-btn" data-lang="French">Français</button>\
         <button class="awe-tb-lang-btn" data-lang="Spanish">Español</button>\
         <button class="awe-tb-lang-btn" data-lang="German">Deutsch</button>\
         <button class="awe-tb-lang-btn" data-lang="Russian">Русский</button>\
         <button class="awe-tb-lang-btn" data-lang="Portuguese">Português</button>\
         <button class="awe-tb-lang-btn" data-lang="Arabic">العربية</button>\
       </div>\
       <div class="awe-tb-footer">\
         <button class="awe-tb-btn awe-tb-btn-apply" id="awe-tb-apply">✓ Apply to Element</button>\
         <button class="awe-tb-btn awe-tb-btn-copy" id="awe-tb-copy">📋 Copy</button>\
         <button class="awe-tb-btn awe-tb-btn-close" id="awe-tb-close">×</button>\
       </div>\
       <div class="awe-tb-error"></div>\
     ';

     // Hide initially
     translateBubble.style.display = 'none';
     document.body.appendChild(translateBubble);

     // ---- Action button clicks (shown after translation) ----
     var applyBtn = translateBubble.querySelector('#awe-tb-apply');
     if (applyBtn) {
       applyBtn.addEventListener('click', function(e) {
         e.stopPropagation();
         applyTranslateResult();
       });
     }

     var copyBtn = translateBubble.querySelector('#awe-tb-copy');
     if (copyBtn) {
       copyBtn.addEventListener('click', function(e) {
         e.stopPropagation();
         copyTranslationResult();
       });
     }

     var closeBtn = translateBubble.querySelector('#awe-tb-close');
     if (closeBtn) {
       closeBtn.addEventListener('click', function(e) {
         e.stopPropagation();
         hideTranslateBubble(false);
       });
     }

     // ---- Translate buttons (shown before translation) ----
     var transZh = translateBubble.querySelector('#awe-tb-trans-zh');
     if (transZh) {
       transZh.addEventListener('click', function(e) {
         e.stopPropagation();
         hideLangSelector();
         performTranslate('Translate this text to Chinese (简体中文).');
       });
     }

     var langPicker = translateBubble.querySelector('#awe-tb-lang-picker');
     if (langPicker) {
       langPicker.addEventListener('click', function(e) {
         e.stopPropagation();
         toggleLangSelector();
       });
     }

     // ---- Language selector clicks ----
     translateBubble.querySelectorAll('.awe-tb-lang-btn').forEach(function(btn) {
       btn.addEventListener('click', function(e) {
         e.stopPropagation();
         var lang = this.dataset.lang;
         hideLangSelector();
         performTranslate('Translate this text to ' + lang + '.');
       });
     });

     // ---- Mouse enter/leave for auto-hide (delayed) ----
     translateBubble.addEventListener('mouseenter', function() {
       if (translateHoverTimer) { clearTimeout(translateHoverTimer); translateHoverTimer = null; }
     });

     translateBubble.addEventListener('mouseleave', function() {
       hideTranslateBubble(true);
     });
   }

   function showTranslateBubble(sourceText, targetElement, mouseX, mouseY) {
     createTranslateBubble();

     translateTargetEl = targetElement;
     translateOriginalText = sourceText || '';
     translateCurrentResult = '';

     // Reset bubble state
     translateBubble.style.display = '';
     translateBubble.className = 'awe-hiding';  // start hidden for animation

     var sourceEl = translateBubble.querySelector('.awe-tb-source-text');
     if (sourceEl) {
       sourceEl.textContent = sourceText;
     }

     // Hide translation result, loading, error
     var body = translateBubble.querySelector('.awe-tb-body');
     if (body) body.classList.remove('awe-has-result');
     var loading = translateBubble.querySelector('.awe-tb-loading');
     if (loading) loading.classList.remove('awe-show');
     var error = translateBubble.querySelector('.awe-tb-error');
     if (error) { error.textContent = ''; error.classList.remove('awe-show'); }

     // Show translation buttons, hide lang selector
     var actions = translateBubble.querySelector('.awe-tb-actions');
     if (actions) actions.classList.remove('awe-hidden');
     hideLangSelector();

     // Position bubble near the mouse / selection
     positionTranslateBubble(mouseX, mouseY);

     // Force reflow then show
     requestAnimationFrame(function() {
       requestAnimationFrame(function() {
         translateBubble.className = 'awe-visible';
         _translateBubbleActive = true;
       });
     });
   }

   function positionTranslateBubble(mouseX, mouseY) {
     var rect = translateBubble.getBoundingClientRect();
     var bubbleW = rect.width || 320;
     var bubbleH = rect.height || 180;
     var padding = 12;

     var x = mouseX - bubbleW / 2;
     var y = mouseY - bubbleH - 16; // above cursor

     // Keep within viewport
     if (x < padding) x = padding;
     if (x + bubbleW > window.innerWidth - padding) x = window.innerWidth - bubbleW - padding;
     if (y < padding) {
       // If not enough space above, show below
       y = mouseY + 16;
       translateBubble.style.setProperty('--arrow-pos', 'top');
     } else {
       translateBubble.style.setProperty('--arrow-pos', 'bottom');
     }

     translateBubble.style.left = x + 'px';
     translateBubble.style.top = y + 'px';
     translateBubble.style.right = '';
     translateBubble.style.bottom = '';
   }

   function hideTranslateBubble(delayed) {
     if (delayed) {
       // Schedule hide after delay to avoid accidental dismissal
       if (translateHoverTimer) clearTimeout(translateHoverTimer);
       translateHoverTimer = setTimeout(function() {
         doHideTranslateBubble();
       }, 200);
     } else {
       doHideTranslateBubble();
     }
   }

   function doHideTranslateBubble() {
     if (translateHoverTimer) { clearTimeout(translateHoverTimer); translateHoverTimer = null; }
     translateBubble.className = 'awe-hiding';
     _translateBubbleActive = false;
     // Wait for animation to finish before hiding completely
     setTimeout(function() {
       translateBubble.style.display = 'none';
       translateTargetEl = null;
       translateCurrentResult = '';
       if (translateTargetEl) {
         translateTargetEl.classList.remove('awe-element-translating');
       }
     }, 260);
   }

   function toggleLangSelector() {
     var sel = translateBubble.querySelector('.awe-tb-lang-selector');
     if (!sel) return;
     if (sel.classList.contains('awe-show')) {
       hideLangSelector();
     } else {
       sel.classList.add('awe-show');
       // Re-hide actions
       var actions = translateBubble.querySelector('.awe-tb-actions');
       if (actions) actions.classList.add('awe-hidden');
     }
   }

   function hideLangSelector() {
     var sel = translateBubble.querySelector('.awe-tb-lang-selector');
     if (sel) sel.classList.remove('awe-show');
     var actions = translateBubble.querySelector('.awe-tb-actions');
     if (actions) actions.classList.remove('awe-hidden');
   }

   async function performTranslate(command) {
     if (!translateTargetEl) return;

     var sourceText = translateOriginalText || (translateTargetEl.textContent || '').trim();
     if (!sourceText) { hideTranslateBubble(false); return; }

     // UI: show loading, hide buttons
     var body = translateBubble.querySelector('.awe-tb-body');
     var loading = translateBubble.querySelector('.awe-tb-loading');
     var actions = translateBubble.querySelector('.awe-tb-actions');
     var error = translateBubble.querySelector('.awe-tb-error');

     if (actions) actions.classList.add('awe-hidden');
     if (loading) loading.classList.add('awe-show');
     if (body) body.classList.remove('awe-has-result');
     if (error) { error.textContent = ''; error.classList.remove('awe-show'); }

     try {
       var response = await chrome.runtime.sendMessage({
         action: 'ai-modify',
         command: command,
         elementText: sourceText,
         elementTag: translateTargetEl.tagName?.toLowerCase() || 'div',
       });

       loading.classList.remove('awe-show');

       if (response.success && response.newContent) {
         translateCurrentResult = response.newContent;
         var transText = translateBubble.querySelector('.awe-tb-translation-text');
         var transLabel = translateBubble.querySelector('.awe-tb-translation-label');
         if (transText) transText.textContent = response.newContent;
         if (transLabel) {
           var isZh = /chinese|zh|中文/i.test(command);
           transLabel.textContent = isZh ? 'Chinese (简体中文)' : response.newContent;
         }
         if (body) body.classList.add('awe-has-result');

         // Highlight the target element briefly
         translateTargetEl.classList.add('awe-element-translating');
       } else {
         throw new Error(response.error || 'Translation failed');
       }
     } catch (err) {
       loading.classList.remove('awe-show');
       console.error('[Translate Bubble] Error:', err);

       // Local fallback for translation
       if (/chinese|zh|中文/i.test(command)) {
         translateCurrentResult = '（AI翻译：' + sourceText.substring(0, 50) + (sourceText.length > 50 ? '...' : '') + '）';
       } else {
         translateCurrentResult = '[Translation] ' + sourceText;
       }

       var transText2 = translateBubble.querySelector('.awe-tb-translation-text');
       if (transText2) transText2.textContent = translateCurrentResult;
       if (body) body.classList.add('awe-has-result');
     }
   }

   function applyTranslateResult() {
     if (!translateTargetEl || !translateCurrentResult) return;

     saveSnapshot();

     // Apply translation to the element's text content
     if (translateTargetEl.childNodes.length === 1 && translateTargetEl.firstChild.nodeType === Node.TEXT_NODE) {
       translateTargetEl.textContent = translateCurrentResult;
     } else {
       // For elements with mixed children, replace first text node or wrap
       var walker = document.createTreeWalker(translateTargetEl, NodeFilter.SHOW_TEXT);
       var firstText = walker.nextNode();
       if (firstText) {
         firstText.textContent = translateCurrentResult;
       } else {
         // No text node found — clear and set new content
         translateTargetEl.innerHTML = '';
         var span = document.createElement('span');
         span.textContent = translateCurrentResult;
         translateTargetEl.appendChild(span);
       }
     }

     updatePreview(translateTargetEl);
     showToast('Translation applied!', 'success');
     hideTranslateBubble(false);
   }

   function copyTranslationResult() {
     if (!translateCurrentResult) return;
     navigator.clipboard.writeText(translateCurrentResult).then(function() {
       showToast('Translation copied!', 'success');
     }).catch(function() {
       // Fallback
       var ta = document.createElement('textarea');
       ta.value = translateCurrentResult;
       document.body.appendChild(ta);
       ta.select();
       document.execCommand('copy');
       document.body.removeChild(ta);
       showToast('Translation copied!', 'success');
     });
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
     var contextTarget = null; // Store target element when menu opens
     var openMenuData = {};    // Store click coordinates

     Object.keys(actions).forEach(function(btnId) {
       document.getElementById(btnId).addEventListener('click', function(e) {
         e.stopPropagation();
         menu.style.display = 'none';

         var targetEl = contextTarget;
         if (!targetEl || targetEl.closest('#awe-context-menu') || targetEl.closest('#awe-editor-panel')) return;

         selectedElement = targetEl;
         highlightElement(targetEl);

         var action = actions[btnId];
         if (action === 'select') {
           openPanel();
           updatePreview(targetEl);
         } else if (action === 'translate') {
           saveSnapshot();
           // Send to AI API for real translation instead of local placeholder
           handleAIModifyFromContext(targetEl, 'Translate this text to Chinese (简体中文). Keep the same format and tone.');
           addToHistory('Translate to Chinese', 'ai', null);
           showToast('Translation requested!', 'success');
         } else if (action === 'simplify') {
           handleAIModifyFromContext(targetEl, 'Simplify the text so it is easier to understand.');
           addToHistory('Simplify', 'ai', null);
           showToast('Simplifying...', 'success');
         } else if (action === 'longer') {
           handleAIModifyFromContext(targetEl, 'Expand and make this content longer and more detailed.');
           addToHistory('Make Longer', 'ai', null);
           showToast('Expanding...', 'success');
         } else if (action === 'shorter') {
           handleAIModifyFromContext(targetEl, 'Make this content much shorter and concise.');
           addToHistory('Make Shorter', 'ai', null);
           showToast('Shortening...', 'success');
         } else if (action === 'professional') {
           handleAIModifyFromContext(targetEl, 'Rewrite in a professional, formal tone.');
           addToHistory('Professional Tone', 'ai', null);
           showToast('Rewriting professionally...', 'success');
         } else if (action === 'html-copy') {
           navigator.clipboard.writeText(targetEl.outerHTML).then(function() {
             showToast('HTML copied!', 'success');
           }).catch(function() {
             showToast('Failed to copy', 'error');
           });
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
           navigator.clipboard.writeText(css).then(function() {
             showToast('CSS copied!', 'success');
           }).catch(function() {
             showToast('Failed to copy', 'error');
           });
         }
        });
        });

        // Show menu on right-click on page elements
        document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('#awe-context-menu') || e.target.closest('#awe-editor-panel')) return;
        var targetEl = e.target;
        if (!targetEl || targetEl.closest('#awe-trigger-btn') || targetEl.closest('#awe-selection-overlay')) return;

        // Store the clicked element for later use by menu buttons
        contextTarget = targetEl;

        // Show context menu at mouse position
        e.preventDefault();
        var menu = document.getElementById('awe-context-menu');
        menu.style.display = 'block';
        menu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
        menu.style.top = Math.min(e.clientY, window.innerHeight - 350) + 'px';
        });
        }

        // ============================================================
        // Helper: Send AI modify from context menu (bypasses main handler)
        // ============================================================
        async function handleAIModifyFromContext(el, command) {
         try {
         var response = await chrome.runtime.sendMessage({
          action: 'ai-modify',
          command: command,
          elementText: el.textContent?.trim() || '',
          elementTag: el.tagName?.toLowerCase() || 'div',
         });

         if (response.success && response.newContent) {
          // v1.7: show diff preview instead of direct apply
          var oldText = response.oldContent || (el.textContent?.trim() || '');
          saveSnapshot();
          showDiffPreview(oldText, response.newContent, el);
         } else {
          applyLocalModification(el, command);
          showStatus('API not connected. Applied local modification.', '');
         }
         } catch (err) {
         console.error('[Context] AI Error:', err);
         applyLocalModification(el, command);
         showStatus('API not available. Applied local modification.', '');
         }
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
    // Use a custom event to avoid conflict with background.js listener
    // ============================================================

    document.addEventListener('awe-apply-template', function(e) {
      var msg = e.detail;
      if (msg.prompt && selectedElement) {
        document.getElementById('awe-command-input').value = msg.prompt;
        document.querySelectorAll('.awe-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.awe-tab-panel').forEach(function(p) { p.classList.remove('active'); });
        document.querySelector('.awe-tab-btn[data-tab="ai"]').classList.add('active');
        document.getElementById('tab-ai').classList.add('active');
        if (!isOpen) openPanel();
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

   // Close element history dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (_historyDropdownOpen && !e.target.closest('#awe-element-history-btn') && !e.target.closest('#awe-element-history-list')) {
        toggleHistoryDropdown(false);
      }
      // Also close translate bubble on any click outside it
      if (_translateBubbleActive && !e.target.closest('#awe-translate-bubble')) {
        hideTranslateBubble(true);
      }
    });

    // ============================================================
    // Quick Translate: detect text selection via mouseup / contextmenu
    // ============================================================
    document.addEventListener('mouseup', function(e) {
      // Don't trigger on our own elements
      if (e.target.closest('#awe-translate-bubble') ||
          e.target.closest('#awe-editor-panel') ||
          e.target.closest('#awe-trigger-btn')) return;

      var selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      var selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 1) return;

      // Don't trigger on input/textarea elements (user is typing)
      var tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
          e.target.closest('input') || e.target.closest('textarea') ||
          selection.anchorNode && selection.anchorNode.nodeType === Node.TEXT_NODE &&
          selection.anchorNode.parentElement &&
          (selection.anchorNode.parentElement.isContentEditable)) return;

      // Show translate bubble at selection location
      var targetEl = findNearestBlockElement(selection.anchorNode);
      showTranslateBubble(selectedText, targetEl, e.clientX, e.clientY);
    });

    // Also trigger from contextmenu (right-click) when text is selected
    document.addEventListener('contextmenu', function(e) {
      // Check if there's a selection
      var selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      var selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 1) return;

      var tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
          e.target.closest('input') || e.target.closest('textarea')) return;

      var targetEl = findNearestBlockElement(selection.anchorNode);
      showTranslateBubble(selectedText, targetEl, e.clientX, e.clientY);

      // Let the normal context menu also show (user can choose original menu or bubble)
      // Don't preventDefault — we want both to be usable
    });

    function findNearestBlockElement(node) {
      if (!node) return document.body;
      var el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      while (el && !el.closest('#awe-editor-panel') && !el.closest('#awe-translate-bubble')) {
        if (el.tagName && ['P', 'DIV', 'SPAN', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
          'LI', 'TD', 'TH', 'BUTTON', 'LABEL', 'STRONG', 'EM', 'B', 'I', 'U', 'MARK', 'CODE'].includes(el.tagName)) {
          return el;
        }
        if (el === document.body) break;
        el = el.parentElement;
      }
      return el || document.body;
    }

   // Load persisted element history on init
    loadElementHistory();

    // ============================================================
    // CSS Rules Panel (v1.6) — render and apply saved rules
    // ============================================================
    function refreshCssRulesPanel() {
      chrome.runtime.sendMessage({ action: 'get-css-rules' }, function(response) {
        var rules = response && response.rules ? response.rules : [];
        var container = document.getElementById('css-rules-list-content');
        if (!container) return;

        if (rules.length === 0) {
          container.innerHTML = '<p style="text-align:center;font-size:12px;color:#475569;padding:8px 0;">No custom CSS rules saved. Open the extension popup to create some.</p>';
          return;
        }

        var html = '';
        for (var i = 0; i < rules.length; i++) {
          var r = rules[i];
          var enabled = r.enabled !== false;
          var selectorText = escapeHtml((r.selector || '').substring(0, 45));
          var nameText = escapeHtml(r.name || 'Unnamed Rule');
          html += '<div class="css-rule-panel-item" data-id="' + r.id + '" style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#0f0f23;border:1px solid #2d2d4a;border-radius:6px;margin-bottom:4px;font-size:12px;">' +
            '<label class="toggle-switch" style="flex-shrink:0;" title="' + (enabled ? 'Enabled' : 'Disabled') + '">' +
              '<input type="checkbox"' + (enabled ? ' checked' : '') + ' data-action="panel-toggle-rule" data-id="' + r.id + '">' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
            '<span style="flex:1;color:#e2e8f0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(r.name || '') + '">' + nameText + '</span>' +
            '<span style="color:#94a3b8;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;" title="' + selectorText + '">' + selectorText + '</span>' +
            '<button class="btn-icon" title="Delete rule" data-action="panel-delete-rule" data-id="' + r.id + '" style="flex-shrink:0;">🗑</button>' +
          '</div>';
        }
        container.innerHTML = html;

        // Attach toggle handlers
        container.querySelectorAll('[data-action="panel-toggle-rule"]').forEach(function(cb) {
          cb.addEventListener('change', function(e) {
            e.stopPropagation();
            var ruleId = this.dataset.id;
            chrome.runtime.sendMessage({ action: 'get-css-rules' }, function(resp) {
              var rules = resp && resp.rules ? resp.rules : [];
              for (var j = 0; j < rules.length; j++) {
                if (rules[j].id === ruleId) {
                  rules[j].enabled = this.checked;
                  break;
                }
              }
              chrome.storage.sync.set({ customCssRules: rules }, function() {});
            }.bind({ checked: this.checked }));
          });
        });

        // Attach delete handlers
        container.querySelectorAll('[data-action="panel-delete-rule"]').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var ruleId = this.dataset.id;
            chrome.runtime.sendMessage({ action: 'delete-css-rule', ruleId: ruleId }, function() {
              refreshCssRulesPanel();
            });
          });
        });
      });
    }

    // Apply All button in content panel (v1.6)
    document.addEventListener('click', function(e) {
      if (e.target.id === 'css-rules-apply-all-btn') {
        chrome.runtime.sendMessage({ action: 'apply-css-rules' }, function(resp) {
          if (resp && resp.success) {
            showToast('Applied ' + (resp.count || 0) + ' CSS rule(s) to the page!', 'success');
          } else {
            showToast('Failed to apply CSS rules.', 'error');
          }
        });
      }
    });

    })();
