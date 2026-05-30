// AI Web Editor - Background Service Worker
// Handles AI API calls and manages extension state

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AI Web Editor] Installed');
  chrome.contextMenus.create({
      id: 'awe-edit-selected',
      title: '✦ AI Web Editor — Edit this element',
      contexts: ['all'],
    });
    // Add quick-action submenu for common operations
    chrome.contextMenus.create({
      id: 'awe-submenu',
      title: 'Quick Actions',
      contexts: ['all'],
    });
    const QUICK_ITEMS = [
      { id: 'awe-translate-zh', parentId: 'awe-submenu', title: '🇨🇳 Translate → Chinese', contexts: ['image', 'selection', 'link'], targetUrlPatterns: ['*://*/*'] },
      { id: 'awe-translate-en', parentId: 'awe-submenu', title: '🇺🇸 Translate → English', contexts: ['image', 'selection', 'link'] },
      { id: 'awe-copy-html', parentId: 'awe-submenu', title: '📋 Copy Element HTML', contexts: ['all'] },
      { id: 'awe-copy-text', parentId: 'awe-submenu', title: '📝 Copy Text Content', contexts: ['all'] },
    ];
    for (let i = 0; i < QUICK_ITEMS.length; i++) {
      chrome.contextMenus.create(QUICK_ITEMS[i]);
    }
  chrome.storage.sync.get(['apiKey'], (result) => {
    if (!result.apiKey) {
      console.log('[AI Web Editor] No API key set. Using local fallback mode.');
    } else {
      console.log('[AI Web Editor] API key configured.');
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ai-modify') {
    handleAIModify(message.command, message.elementText, message.elementTag, message.conversationHistory, sendResponse);
    return true;
  }
  if (message.action === 'save-api-key') {
    chrome.storage.sync.set({ apiKey: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  if (message.action === 'get-api-key') {
    chrome.storage.sync.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || '' });
    });
    return true;
  }
  if (message.action === 'test-connection') {
    handleTestConnection(message.apiKey, message.provider, message.baseUrl, sendResponse);
    return true;
  }

  // ============================================================
  // Daily Usage Tracking (v1.1)
  // ============================================================
  if (message.action === 'get-daily-usage') {
    chrome.storage.sync.get(['dailyUsage', 'lastResetDate', 'dailyLimit'], function(result) {
      var today = new Date().toISOString().substring(0, 10);
      var lastDate = result.lastResetDate || '';
      var count = 0;
      if (result.dailyUsage !== undefined && lastDate === today) {
        count = result.dailyUsage;
      } else if (lastDate !== today) {
        chrome.storage.sync.set({ dailyUsage: 0, lastResetDate: today }, function() {});
        count = 0;
      }
      sendResponse({ count: count, limit: result.dailyLimit || 50 });
    });
    return true;
  }

  if (message.action === 'increment-usage') {
    chrome.storage.sync.get(['dailyUsage', 'lastResetDate', 'dailyLimit'], function(result) {
      var today = new Date().toISOString().substring(0, 10);
      var lastDate = result.lastResetDate || '';
      var count = (result.dailyUsage || 0);
      var limit = result.dailyLimit || 50;

      if (lastDate !== today) {
        chrome.storage.sync.set({ dailyUsage: 1, lastResetDate: today }, function() {});
        sendResponse({ count: 1, limit: limit, exceeded: false });
      } else if (count >= limit) {
        sendResponse({ count: count, limit: limit, exceeded: true });
      } else {
        chrome.storage.sync.set({ dailyUsage: count + 1 }, function() {});
        sendResponse({ count: count + 1, limit: limit, exceeded: false });
      }
    });
    return true;
  }

  // ============================================================
  // Model Management (v1.2)
  // ============================================================
  if (message.action === 'get-model') {
    chrome.storage.sync.get(['apiModel'], function(result) {
      sendResponse({ model: result.apiModel || 'gpt-4o-mini' });
    });
    return true;
  }

  if (message.action === 'save-model') {
    chrome.storage.sync.set({ apiModel: message.model }, function() {
      sendResponse({ success: true });
    });
    return true;
  }

  // ============================================================
  // Daily Limit Management (v1.2)
  // ============================================================
  if (message.action === 'save-daily-limit') {
    chrome.storage.sync.set({ dailyLimit: message.limit }, function() {
      sendResponse({ success: true });
    });
    return true;
  }

  // ============================================================
  // Template Apply (v1.5) — dispatch to active tab
  // ============================================================
  if (message.action === 'apply-template') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        handleApplyTemplate(tabs[0].id, message.prompt);
      }
    });
    sendResponse({ success: true });
    return true;
  }

  // ============================================================
  // Save Custom CSS Rules (v1.6)
  // ============================================================
  if (message.action === 'save-css-rule') {
    chrome.storage.sync.get(['customCssRules'], function(result) {
      var rules = result.customCssRules || [];
      var existingIdx = rules.findIndex(function(r) { return r.id === message.rule.id; });
      if (existingIdx >= 0) {
        rules[existingIdx] = message.rule;
      } else {
        rules.push(message.rule);
      }
      chrome.storage.sync.set({ customCssRules: rules }, function() {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // ============================================================
  // Get Custom CSS Rules (v1.6)
  // ============================================================
  if (message.action === 'get-css-rules') {
    chrome.storage.sync.get(['customCssRules'], function(result) {
      sendResponse({ rules: result.customCssRules || [] });
    });
    return true;
  }

  // ============================================================
  // Delete Custom CSS Rule (v1.6)
  // ============================================================
  if (message.action === 'delete-css-rule') {
    chrome.storage.sync.get(['customCssRules'], function(result) {
      var rules = (result.customCssRules || []).filter(function(r) { return r.id !== message.ruleId; });
      chrome.storage.sync.set({ customCssRules: rules }, function() {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // ============================================================
   // Apply All CSS Rules to Page (v1.6)
   // ============================================================
   if (message.action === 'apply-css-rules') {
     chrome.storage.sync.get(['customCssRules'], function(result) {
       var rules = result.customCssRules || [];
       chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
         if (tabs[0]) {
           chrome.scripting.executeScript({
             target: { tabId: tabs[0].id },
             func: (rules) => {
               rules.forEach(function(rule) {
                 try {
                   var matches = document.querySelectorAll(rule.selector);
                   matches.forEach(function(el) {
                     el.setAttribute('style', (el.getAttribute('style') || '') + ' !important; ' + rule.css);
                   });
                 } catch(e) {}
               });
             },
             args: [rules],
           });
         }
       });
       sendResponse({ success: true, count: rules.length });
     });
     return true;
   }

   // ============================================================
   // Apply Custom Theme (v1.9)
   // ============================================================
   if (message.action === 'apply-custom-theme') {
     chrome.storage.sync.get(['customThemes', 'activeThemeName'], function(result) {
       var themes = result.customThemes || [];
       var activeName = result.activeThemeName;

       // Find the active theme (built-in presets or custom)
       var allThemes = getDefaultPresets().concat(themes);
       var active = null;
       if (activeName) {
         for (var i = 0; i < allThemes.length; i++) {
           if (allThemes[i].name === activeName) { active = allThemes[i]; break; }
         }
       }

       // If no active theme found, fall back to first custom or default dark
       if (!active && themes.length > 0) {
         active = themes[themes.length - 1];
       } else if (!active) {
         active = getDefaultPresets()[0]; // Dark
       }

       chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
         if (tabs[0]) {
           chrome.scripting.executeScript({
             target: { tabId: tabs[0].id },
             func: (theme) => {
               applyThemeToPanel(theme);
             },
             args: [active],
           });
         }
       });

       sendResponse({ success: true, themeName: active.name });
     });
     return true;
   }

   // ============================================================
   // Get Active Theme (v1.9)
   // ============================================================
   if (message.action === 'get-active-theme') {
     chrome.storage.sync.get(['customThemes', 'activeThemeName'], function(result) {
       var themes = result.customThemes || [];
       var activeName = result.activeThemeName;

       var allThemes = getDefaultPresets().concat(themes);
       var active = null;
       if (activeName) {
         for (var i = 0; i < allThemes.length; i++) {
           if (allThemes[i].name === activeName) { active = allThemes[i]; break; }
         }
       }

       if (!active && themes.length > 0) {
         active = themes[themes.length - 1];
       } else if (!active) {
         active = getDefaultPresets()[0];
       }

       sendResponse({ theme: active, allThemes: allThemes, customThemes: themes, activeThemeName: activeName });
     });
     return true;
   }

   // ============================================================
   // Save Custom Theme (v1.9)
   // ============================================================
   if (message.action === 'save-custom-theme') {
     chrome.storage.sync.get(['customThemes'], function(result) {
       var themes = result.customThemes || [];
       var newTheme = message.theme;

       // Check if updating existing custom theme by id
       var idx = themes.findIndex(function(t) { return t._id === newTheme._id; });
       if (idx >= 0) {
         themes[idx] = newTheme;
       } else {
         themes.push(newTheme);
       }

       chrome.storage.sync.set({
         customThemes: themes,
         activeThemeName: newTheme.name
       }, function() {
         sendResponse({ success: true, themeName: newTheme.name });
       });
     });
     return true;
   }

   // ============================================================
   // Delete Custom Theme (v1.9)
   // ============================================================
   if (message.action === 'delete-custom-theme') {
     chrome.storage.sync.get(['customThemes', 'activeThemeName'], function(result) {
       var themes = (result.customThemes || []).filter(function(t) { return t._id !== message.themeId; });
       var newActive = result.activeThemeName;

       // If deleted theme was active, set to last remaining or default
       if (newActive === message.activeThemeName) {
         if (themes.length > 0) {
           newActive = themes[themes.length - 1].name;
         } else {
           newActive = 'Dark'; // built-in preset
         }
       }

       chrome.storage.sync.set({
         customThemes: themes,
         activeThemeName: newActive
       }, function() {
         sendResponse({ success: true, newActiveThemeName: newActive });
       });
     });
     return true;
   }

   // ============================================================
   // Set Active Theme (v1.9)
   // ============================================================
   if (message.action === 'set-active-theme') {
     chrome.storage.sync.set({ activeThemeName: message.themeName }, function() {
       sendResponse({ success: true });
     });
     return true;
   }

   return false;
  });

// Handle context menu clicks — right-click to edit or perform quick action
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'awe-edit-selected') {
    // Get mouse position and pass to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'awe-get-mouse-position',
    }, (mousePos) => {
      if (chrome.runtime.lastError || !mousePos) {
        console.error('[AWEditor] Cannot get mouse position');
        return;
      }
      chrome.tabs.sendMessage(tab.id, {
        action: 'awe-context-menu-edit',
        rect: mousePos,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AWEditor] Context menu error:', chrome.runtime.lastError.message);
        }
      });
    });
  } else if (info.menuItemId === 'awe-translate-zh') {
    // Translate to Chinese
    chrome.tabs.sendMessage(tab.id, {
      action: 'awe-quick-action',
      type: 'translate',
      targetLang: 'Chinese',
      text: info.selectionText || '',
      srcUrl: info.srcUrl || '',
    }, () => {});
  } else if (info.menuItemId === 'awe-translate-en') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'awe-quick-action',
      type: 'translate',
      targetLang: 'English',
      text: info.selectionText || '',
      srcUrl: info.srcUrl || '',
    }, () => {});
  } else if (info.menuItemId === 'awe-copy-html') {
    chrome.tabs.sendMessage(tab.id, { action: 'awe-quick-action', type: 'copy-html' }, () => {});
  } else if (info.menuItemId === 'awe-copy-text') {
    chrome.tabs.sendMessage(tab.id, { action: 'awe-quick-action', type: 'copy-text', text: info.selectionText || '' }, () => {});
  }
});

// ============================================================
// AI Modification Handler
// ============================================================

async function handleAIModify(command, elementText, elementTag, conversationHistory, sendResponse) {
  // Read full API config from storage
  const result = await new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl', 'apiModel'], resolve);
  });

  const apiKey = result.apiKey;
  const provider = result.apiProvider || 'openai';
  const baseUrl = (result.apiBaseUrl || '').trim();
  const apiModel = result.apiModel || 'gpt-4o-mini';

  if (!apiKey) {
    sendResponse({ success: false, newContent: null, needsApiKey: true });
    return;
  }

  try {
    let response;
    if (provider === 'openai') {
      response = await callOpenAICompatible(command, elementText, conversationHistory, 'https://api.openai.com/v1', apiKey, apiModel);
    } else if (provider === 'custom') {
      const targetUrl = buildEndpointUrl(baseUrl);
      console.log(`[AI Web Editor] Using custom API: ${targetUrl}`);
      response = await callOpenAICompatible(command, elementText, conversationHistory, targetUrl, apiKey, apiModel);
    } else if (provider === 'google') {
      response = await callGoogleGenerativeAI(command, elementText, conversationHistory, apiKey, apiModel);
    } else {
      const targetUrl = baseUrl ? buildEndpointUrl(baseUrl) : 'https://api.openai.com/v1';
      response = await callOpenAICompatible(command, elementText, conversationHistory, targetUrl, apiKey, apiModel);
    }

    const content = extractAIContent(response);
     // Pass oldContent for diff preview support
     sendResponse({ success: true, newContent: content, oldContent: elementText || '' });
  } catch (err) {
    console.error('[AI Web Editor] API Error:', err);
    sendResponse({ success: false, error: err.message || 'API request failed', needsApiKey: true });
  }
}

async function handleApplyTemplate(tabId, prompt) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (prompt) => {
      document.dispatchEvent(new CustomEvent('awe-apply-template', { detail: { prompt } }));
    },
    args: [prompt],
  });
}

function buildEndpointUrl(baseUrl) {
  if (!baseUrl) return 'https://api.openai.com/v1';
  if (baseUrl.endsWith('/v1')) {
    return baseUrl + '/chat/completions';
  } else if (baseUrl.endsWith('/')) {
    return baseUrl + 'v1/chat/completions';
  }
  return baseUrl + '/v1/chat/completions';
}

// ============================================================
// API Call Functions
// ============================================================

async function callOpenAICompatible(command, elementText, conversationHistory, apiUrl, apiKey, model) {
  const systemPrompt = `You are a helpful AI that rewrites webpage content. 
The user has selected an element on a webpage and wants you to modify it.
Only return the NEW content for this element. Do NOT include markdown formatting like backticks or code blocks.
Do NOT explain your changes — just give me the modified text.`;

  const modelName = model || 'gpt-4o-mini';
  console.log(`[AI Web Editor] Calling API: ${apiUrl} with model: ${modelName}`);

  const messages = [{ role: 'system', content: systemPrompt }];
  if (conversationHistory && conversationHistory.length > 0) {
    for (var i = 0; i < conversationHistory.length; i++) {
      var msg = conversationHistory[i];
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: `Command: "${command}"\n\nCurrent content:\n${elementText || '(empty element)'}\n\nPlease rewrite this according to the command.` });
      } else if (msg.role === 'assistant') {
        // Assistant responses are already applied, so we use them as context
      }
    }
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${errBody}`);
  }

  return response.json();
}

async function callGoogleGenerativeAI(command, elementText, conversationHistory, apiKey, model) {
  const systemPrompt = `You are a helpful AI that rewrites webpage content. \nOnly return the NEW content. No explanations.`;

  const modelName = model || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  console.log(`[AI Web Editor] Calling Google Gemini API with model: ${modelName}`);

  const parts = [
    { text: systemPrompt },
    { text: `Command: "${command}". Current content:\n${elementText || '(empty element)'}` }
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: parts }],
      generationConfig: { maxOutputTokens: 1000 },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Google API error ${response.status}: ${errBody}`);
  }

  return response.json();
}

function extractAIContent(response) {
  try {
    // OpenAI format: { choices: [{ message: { content: "..." }}] }
    if (response.choices && response.choices[0]?.message?.content) {
      let content = response.choices[0].message.content.trim();
      content = content.replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim();
      return content;
    }
    // Google format: { candidates: [{ content: { parts: [{ text: "..." }}] }] }
    if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
      let content = response.candidates[0].content.parts[0].text.trim();
      content = content.replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim();
      return content;
    }
  } catch (e) {
    console.error('[AI Web Editor] Failed to extract AI content:', e);
  }
  return null;
}

// ============================================================
// Test Connection (called from popup)
// ============================================================

async function handleTestConnection(apiKey, provider, baseUrl, sendResponse) {
  try {
    if (provider === 'openai') {
      await callOpenAICompatible('test', 'test', null, 'https://api.openai.com/v1', apiKey, 'gpt-4o-mini');
    } else if (provider === 'custom' && baseUrl) {
      await callOpenAICompatible('test', 'test', null, buildEndpointUrl(baseUrl), apiKey, 'gpt-4o-mini');
    } else {
      sendResponse({ success: true, message: 'Settings saved — will be used in extension' });
      return;
    }
    sendResponse({ success: true, message: 'Connection successful!' });
  } catch (err) {
    console.error('[AI Web Editor] Test connection failed:', err);
    sendResponse({ success: false, error: err.message });
  }
}

// ============================================================
// Theme Presets & Helpers (v1.9)
// ============================================================

function getDefaultPresets() {
  return [
    {
      name: 'Dark',
      isPreset: true,
      colors: {
        bg: '#1a1a2e', fg: '#e2e8f0', border: '#2d2d4a', accent: '#6366f1',
        headerStart: '#6366f1', headerEnd: '#8b5cf6'
      },
      position: 'right-middle',
      width: '380px'
    },
    {
      name: 'Light',
      isPreset: true,
      colors: {
        bg: '#ffffff', fg: '#1e293b', border: '#e2e8f0', accent: '#6366f1',
        headerStart: '#6366f1', headerEnd: '#8b5cf6'
      },
      position: 'right-middle',
      width: '380px'
    },
    {
      name: 'Ocean Blue',
      isPreset: true,
      colors: {
        bg: '#0c1929', fg: '#a5d6ff', border: '#1a3a5c', accent: '#0ea5e9',
        headerStart: '#0369a1', headerEnd: '#0ea5e9'
      },
      position: 'right-middle',
      width: '420px'
    },
    {
      name: 'Green Terminal',
      isPreset: true,
      colors: {
        bg: '#0a0f0a', fg: '#33ff33', border: '#1a2e1a', accent: '#22c55e',
        headerStart: '#166534', headerEnd: '#22c55e'
      },
      position: 'right-middle',
      width: '420px'
    }
  ];
}

