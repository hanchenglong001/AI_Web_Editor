// AI Web Editor - Popup JS

document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const apiBaseUrlInput = document.getElementById('apiBaseUrl');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelInput = document.getElementById('modelInput');
  const dailyLimitInput = document.getElementById('dailyLimit');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('apiStatus');

  // ============================================================
  // CSS Rules Management (v1.6)
  // ============================================================
  let editingRuleId = null;

  const addRuleBtn = document.getElementById('add-rule-btn');
  const applyAllCssBtn = document.getElementById('apply-all-css-btn');
  const cssRulesListEl = document.getElementById('css-rules-list');
  const cssRulesSection = document.getElementById('css-rules-section');
  const cssRulesDivider = document.getElementById('css-rules-divider');
  const modalOverlay = document.getElementById('css-rule-modal-overlay');
  const modalTitle = document.getElementById('css-rule-modal-title');
  const ruleNameInput = document.getElementById('rule-name-input');
  const ruleSelectorInput = document.getElementById('rule-selector-input');
  const ruleCssInput = document.getElementById('rule-css-input');
  const saveRuleBtn = document.getElementById('save-rule-btn');
  const cancelRuleBtn = document.getElementById('cancel-rule-btn');

  // Load and render CSS rules
  function loadCssRules() {
    chrome.runtime.sendMessage({ action: 'get-css-rules' }, function(response) {
      var rules = response && response.rules ? response.rules : [];
      renderCssRulesList(rules);
    });
  }

  function renderCssRulesList(rules) {
    // Show/hide section based on whether there are rules
    if (!rules || rules.length === 0) {
      cssRulesSection.style.display = 'none';
      cssRulesDivider.style.display = 'none';
      return;
    }
    cssRulesSection.style.display = 'block';
    cssRulesDivider.style.display = 'block';

    var html = '';
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      var enabled = r.enabled !== false;
      var selectorText = escapeHtml((r.selector || '').substring(0, 50));
      var nameText = escapeHtml(r.name || 'Unnamed Rule');
      html += '<div class="css-rule-item" data-id="' + r.id + '">' +
        '<span class="rule-name" title="' + escapeHtml(r.name || '') + '" data-action="edit-rule">' + nameText + '</span>' +
        '<span class="rule-selector" title="' + selectorText + '">' + selectorText + '</span>' +
        '<div class="rule-actions">' +
          '<label class="toggle-switch" title="' + (enabled ? 'Enabled' : 'Disabled') + '">' +
            '<input type="checkbox" data-action="toggle-rule" data-id="' + r.id + '"' + (enabled ? ' checked' : '') + '>' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
          '<button class="btn-icon" title="Delete rule" data-action="delete-rule" data-id="' + r.id + '">🗑</button>' +
        '</div>' +
      '</div>';
    }
    cssRulesListEl.innerHTML = html;

    // Attach event listeners to toggle switches
    cssRulesListEl.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
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

    // Click on name to edit
    cssRulesListEl.querySelectorAll('.rule-name').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var ruleId = this.closest('.css-rule-item').dataset.id;
        openEditModal(ruleId);
      });
    });

    // Delete buttons
    cssRulesListEl.querySelectorAll('[data-action="delete-rule"]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var ruleId = this.dataset.id;
        chrome.runtime.sendMessage({ action: 'delete-css-rule', ruleId: ruleId }, function(resp) {
          loadCssRules();
        });
      });
    });
  }

  // Open modal for new rule or editing
  function openEditModal(ruleId) {
    if (ruleId) {
      // Edit existing
      chrome.runtime.sendMessage({ action: 'get-css-rules' }, function(resp) {
        var rules = resp && resp.rules ? resp.rules : [];
        var rule = null;
        for (var i = 0; i < rules.length; i++) {
          if (rules[i].id === ruleId) { rule = rules[i]; break; }
        }
        if (rule) {
          editingRuleId = rule.id;
          modalTitle.textContent = 'Edit CSS Rule';
          ruleNameInput.value = rule.name || '';
          ruleSelectorInput.value = rule.selector || '';
          ruleCssInput.value = rule.css || '';
          modalOverlay.classList.add('active');
        }
      });
    } else {
      // New rule
      editingRuleId = null;
      modalTitle.textContent = 'New CSS Rule';
      ruleNameInput.value = '';
      ruleSelectorInput.value = '';
      ruleCssInput.value = '';
      modalOverlay.classList.add('active');
    }
    setTimeout(function() { ruleNameInput.focus(); }, 100);
  }

  function closeEditModal() {
    modalOverlay.classList.remove('active');
    editingRuleId = null;
  }

  addRuleBtn.addEventListener('click', function() { openEditModal(null); });
  cancelRuleBtn.addEventListener('click', closeEditModal);
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) closeEditModal();
  });

  saveRuleBtn.addEventListener('click', function() {
    var name = ruleNameInput.value.trim();
    var selector = ruleSelectorInput.value.trim();
    var css = ruleCssInput.value.trim();
    if (!name || !selector || !css) {
      alert('Please fill in all fields: Name, Selector, and CSS.');
      return;
    }

    var rule = {
      id: editingRuleId || ('rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      name: name,
      selector: selector,
      css: css,
      enabled: true
    };

    chrome.runtime.sendMessage({ action: 'save-css-rule', rule: rule }, function(resp) {
      closeEditModal();
      loadCssRules();
      showToast('Rule saved!', true);
    });
  });

  // Apply all rules to current page
  applyAllCssBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'apply-css-rules' }, function(resp) {
      if (resp && resp.success) {
        showToast('Applied ' + (resp.count || 0) + ' CSS rule(s) to the page!', true);
      } else {
        showToast('Failed to apply CSS rules.', false);
      }
    });
  });

  // Initial load
  loadCssRules();

  // ============================================================
  // Template Management (v1.5)
  // ============================================================
  const newTemplateBtn = document.getElementById('newTemplateBtn');
  const templateModal = document.getElementById('template-modal');
  const templateNameInput = document.getElementById('templateNameInput');
  const templatePromptInput = document.getElementById('templatePromptInput');
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
  let editingTemplateId = null;

  function loadTemplates() {
    chrome.storage.sync.get(['customTemplates'], function(result) {
      var templates = result.customTemplates || [];
      var html = '';
      for (var i = 0; i < templates.length; i++) {
        var t = templates[i];
        var nameDisplay = escapeHtml(t.name || 'Unnamed');
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#0f0f23;border:1px solid #2d2d4a;border-radius:6px;margin-bottom:4px;font-size:12px;">' +
          '<span style="flex:1;color:#e2e8f0;cursor:pointer;" class="template-name" data-id="' + t.id + '">' + nameDisplay + '</span>' +
          '<button style="background:none;border:1px solid #2d2d4a;color:#94a3b8;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;padding:0;" class="template-edit-btn" data-id="' + t.id + '">✏</button>' +
          '<button style="background:none;border:1px solid #2d2d4a;color:#94a3b8;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;padding:0;" class="template-delete-btn" data-id="' + t.id + '">🗑</button>' +
        '</div>';
      }
      if (templates.length === 0) {
        html = '<p style="text-align:center;font-size:12px;color:#475569;padding:10px 0;">No templates yet. Click "+ New Template" to create one.</p>';
      }
      document.getElementById('template-list').innerHTML = html;

      // Attach handlers
      document.querySelectorAll('.template-name').forEach(function(el) {
        el.addEventListener('click', function() {
          chrome.storage.sync.get(['customTemplates'], function(r2) {
            var tpls = r2.customTemplates || [];
            var tpl = null;
            for (var i = 0; i < tpls.length; i++) {
              if (tpls[i].id === el.dataset.id) { tpl = tpls[i]; break; }
            }
            if (tpl) {
              chrome.runtime.sendMessage({ action: 'apply-template', prompt: tpl.prompt }, function(resp) {});
              showToast('Template "' + tpl.name + '" applied!', true);
            }
          });
        });
      });

      document.querySelectorAll('.template-edit-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          chrome.storage.sync.get(['customTemplates'], function(r2) {
            var tpls = r2.customTemplates || [];
            var tpl = null;
            for (var i = 0; i < tpls.length; i++) {
              if (tpls[i].id === btn.dataset.id) { tpl = tpls[i]; break; }
            }
            if (tpl) {
              editingTemplateId = tpl.id;
              templateNameInput.value = tpl.name || '';
              templatePromptInput.value = tpl.prompt || '';
              saveTemplateBtn.textContent = 'Update';
              templateModal.style.display = 'block';
            }
          });
        });
      });

      document.querySelectorAll('.template-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          chrome.storage.sync.get(['customTemplates'], function(r2) {
            var tpls = (r2.customTemplates || []).filter(function(t) { return t.id !== btn.dataset.id; });
            chrome.storage.sync.set({ customTemplates: tpls }, function() { loadTemplates(); });
          });
        });
      });
    });
  }

  newTemplateBtn.addEventListener('click', function() {
    editingTemplateId = null;
    templateNameInput.value = '';
    templatePromptInput.value = '';
    saveTemplateBtn.textContent = 'Save';
    templateModal.style.display = 'block';
    setTimeout(function() { templateNameInput.focus(); }, 100);
  });

  cancelTemplateBtn.addEventListener('click', function() {
    templateModal.style.display = 'none';
    editingTemplateId = null;
  });

  saveTemplateBtn.addEventListener('click', function() {
    var name = templateNameInput.value.trim();
    var prompt = templatePromptInput.value.trim();
    if (!name || !prompt) {
      alert('Please fill in both Name and Prompt.');
      return;
    }
    chrome.storage.sync.get(['customTemplates'], function(result) {
      var templates = result.customTemplates || [];
      if (editingTemplateId) {
        for (var i = 0; i < templates.length; i++) {
          if (templates[i].id === editingTemplateId) {
            templates[i].name = name;
            templates[i].prompt = prompt;
            break;
          }
        }
      } else {
        templates.push({ id: 'tpl_' + Date.now(), name: name, prompt: prompt });
      }
      chrome.storage.sync.set({ customTemplates: templates }, function() {
        templateModal.style.display = 'none';
        editingTemplateId = null;
        loadTemplates();
      });
    });
  });

  // Load initial templates
  loadTemplates();

  // ============================================================
   // Snippet Management (v1.7)
   // ============================================================
   const newSnippetBtn = document.getElementById('newSnippetBtn');
   const snippetModal = document.getElementById('snippet-modal');
   const snippetNameInput = document.getElementById('snippetNameInput');
   const snippetContentInput = document.getElementById('snippetContentInput');
   const saveSnippetBtn = document.getElementById('saveSnippetBtn');
   const cancelSnippetBtn = document.getElementById('cancelSnippetBtn');
   let editingSnippetId = null;

   function initDefaultSnippets() {
     chrome.storage.sync.get(['snippets'], function(result) {
       if (!result.snippets || result.snippets.length === 0) {
         var defaults = [
           { id: 'snippet_trans_zh', name: '翻译成中文', content: 'Translate the text above into Chinese. Keep the same meaning and tone, but use natural Chinese phrasing.' },
           { id: 'snippet_simplify', name: '改成更简洁', content: 'Rewrite this text to be more concise. Remove unnecessary words while keeping the core message intact.' },
           { id: 'snippet_professional', name: '更专业语气', content: 'Rewrite this with a professional tone suitable for a business context. Use formal language and clear structure.' },
           { id: 'snippet_fix_grammar', name: '修正语法', content: 'Fix any grammar, spelling, or punctuation errors in this text without changing the meaning.' },
           { id: 'snippet_bullet_points', name: '转为要点列表', content: 'Convert the above text into a clear bullet-point list. Highlight key points and keep descriptions brief.' },
         ];
         chrome.storage.sync.set({ snippets: defaults }, function() {
           loadSnippets();
         });
       } else {
         loadSnippets();
       }
     });
   }

   function loadSnippets() {
     chrome.storage.sync.get(['snippets'], function(result) {
       var snippets = result.snippets || [];
       var html = '';
       for (var i = 0; i < snippets.length; i++) {
         var s = snippets[i];
         var nameDisplay = escapeHtml(s.name || 'Unnamed');
         var contentPreview = escapeHtml((s.content || '').substring(0, 40));
         html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#0f0f23;border:1px solid #2d2d4a;border-radius:6px;margin-bottom:4px;font-size:12px;">' +
           '<span style="flex:1;color:#e2e8f0;cursor:pointer;" class="snippet-name" data-id="' + s.id + '" title="' + escapeHtml(s.content || '') + '">' + nameDisplay + '</span>' +
           '<button style="background:none;border:1px solid #2d2d4a;color:#94a3b8;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;padding:0;" class="snippet-edit-btn" data-id="' + s.id + '">✏</button>' +
           '<button style="background:none;border:1px solid #2d2d4a;color:#94a3b8;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;padding:0;" class="snippet-delete-btn" data-id="' + s.id + '">🗑</button>' +
         '</div>';
       }
       if (snippets.length === 0) {
         html = '<p style="text-align:center;font-size:12px;color:#475569;padding:10px 0;">No snippets yet. Click "+ New Snippet" to create one.</p>';
       }
       document.getElementById('snippet-list').innerHTML = html;

       // Attach handlers for snippet name clicks (apply to content panel)
       document.querySelectorAll('.snippet-name').forEach(function(el) {
         el.addEventListener('click', function() {
           chrome.storage.sync.get(['snippets'], function(r2) {
             var snips = r2.snippets || [];
             var snippet = null;
             for (var i = 0; i < snips.length; i++) {
               if (snips[i].id === el.dataset.id) { snippet = snips[i]; break; }
             }
             if (snippet) {
               chrome.runtime.sendMessage({ action: 'apply-snippet', content: snippet.content }, function(resp) {
                 showToast('Snippet "' + snippet.name + '" applied!', true);
               });
             }
           });
         });
       });

       // Edit buttons
       document.querySelectorAll('.snippet-edit-btn').forEach(function(btn) {
         btn.addEventListener('click', function() {
           chrome.storage.sync.get(['snippets'], function(r2) {
             var snips = r2.snippets || [];
             var snippet = null;
             for (var i = 0; i < snips.length; i++) {
               if (snips[i].id === btn.dataset.id) { snippet = snips[i]; break; }
             }
             if (snippet) {
               editingSnippetId = snippet.id;
               snippetNameInput.value = snippet.name || '';
               snippetContentInput.value = snippet.content || '';
               saveSnippetBtn.textContent = 'Update';
               snippetModal.style.display = 'block';
             }
           });
         });
       });

       // Delete buttons
       document.querySelectorAll('.snippet-delete-btn').forEach(function(btn) {
         btn.addEventListener('click', function() {
           chrome.storage.sync.get(['snippets'], function(r2) {
             var snips = (r2.snippets || []).filter(function(s) { return s.id !== btn.dataset.id; });
             chrome.storage.sync.set({ snippets: snips }, function() { loadSnippets(); });
           });
         });
       });
     });
   }

   newSnippetBtn.addEventListener('click', function() {
     editingSnippetId = null;
     snippetNameInput.value = '';
     snippetContentInput.value = '';
     saveSnippetBtn.textContent = 'Save';
     snippetModal.style.display = 'block';
     setTimeout(function() { snippetNameInput.focus(); }, 100);
   });

   cancelSnippetBtn.addEventListener('click', function() {
     snippetModal.style.display = 'none';
     editingSnippetId = null;
   });

   saveSnippetBtn.addEventListener('click', function() {
     var name = snippetNameInput.value.trim();
     var content = snippetContentInput.value.trim();
     if (!name || !content) {
       alert('Please fill in both Name and Content.');
       return;
     }
     chrome.storage.sync.get(['snippets'], function(result) {
       var snippets = result.snippets || [];
       if (editingSnippetId) {
         for (var i = 0; i < snippets.length; i++) {
           if (snippets[i].id === editingSnippetId) {
             snippets[i].name = name;
             snippets[i].content = content;
             break;
           }
         }
       } else {
         snippets.push({ id: 'snippet_' + Date.now(), name: name, content: content });
       }
       chrome.storage.sync.set({ snippets: snippets }, function() {
         snippetModal.style.display = 'none';
         editingSnippetId = null;
         loadSnippets();
       });
     });
   });

   // Load initial snippets
   initDefaultSnippets();


   // ============================================================
   // Main API settings logic
   // ============================================================

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl', 'apiModel', 'dailyLimit'], (result) => {
    if (result.apiProvider) providerSelect.value = result.apiProvider;
    if (result.apiBaseUrl) apiBaseUrlInput.value = result.apiBaseUrl;
    if (result.apiModel) modelInput.value = result.apiModel;
    if (result.dailyLimit) dailyLimitInput.value = result.dailyLimit;
    if (result.apiKey) {
      apiKeyInput.placeholder = '(key saved)';
      statusEl.textContent = '● Connected — API ready';
      statusEl.className = 'status connected';
    }
  });

  // Show/hide base URL based on provider
  providerSelect.addEventListener('change', () => {
    const visible = providerSelect.value === 'custom';
    apiBaseUrlInput.parentElement.style.display = visible ? 'block' : 'none';
    apiBaseUrlInput.required = visible;
  });

  // Initial state
  apiBaseUrlInput.parentElement.style.display = 'none';

  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const provider = providerSelect.value;
    const baseUrl = apiBaseUrlInput.value.trim();
    const apiModel = modelInput.value.trim() || 'gpt-4o-mini';
    const dailyLimit = parseInt(dailyLimitInput.value) || 50;

    if (provider === 'custom' && !baseUrl) {
      statusEl.textContent = '● Error: Base URL required for Custom provider';
      statusEl.className = 'status disconnected';
      return;
    }

    // Save model and daily limit to storage
    chrome.storage.sync.set({ apiModel, dailyLimit }, function() {});

    if (!apiKey) {
      // Allow saving without key — will use local fallback
      await chrome.storage.sync.set({
        apiKey: '',
        apiProvider: provider,
        apiBaseUrl: baseUrl || '',
      });
      statusEl.textContent = '● Saved (local mode only, model: ' + apiModel + ')';
      statusEl.className = 'status disconnected';
      return;
    }

    // Save and verify by sending a message to background
    await chrome.storage.sync.set({
      apiKey,
      apiProvider: provider,
      apiBaseUrl: baseUrl || '',
      apiModel,
      dailyLimit,
    });

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      // Try a simple test through the background script
      const response = await chrome.runtime.sendMessage({
        action: 'test-connection',
        apiKey,
        provider,
        baseUrl,
      });

      if (response?.success) {
        statusEl.textContent = '● Connected — API ready (model: ' + apiModel + ')';
        statusEl.className = 'status connected';
        showToast('API connected successfully!', true);
      } else {
        // Still save — connection might work but test failed
        statusEl.textContent = '● Saved (use in extension, model: ' + apiModel + ')';
        statusEl.className = 'status disconnected';
      }
    } catch (err) {
      console.log('[Popup] Could not verify:', err);
      statusEl.textContent = '● Saved (use in extension, model: ' + apiModel + ')';
      statusEl.className = 'status disconnected';
    }

    saveBtn.textContent = 'Save & Connect';
    saveBtn.disabled = false;
  });

  function showToast(msg, success) {
    const existing = document.getElementById('popup-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'popup-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
      padding: 8px 16px; background: ${success ? '#22c55e' : '#ef4444'};
      color: white; border-radius: 8px; font-size: 13px; z-index: 999;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // ============================================================
  // Utility
  // ============================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
