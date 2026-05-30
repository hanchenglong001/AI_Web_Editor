// AI Web Editor - Background Service Worker
// Handles AI API calls and manages extension state

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AI Web Editor] Installed');
  chrome.contextMenus.create({
    id: 'awe-edit-selected',
    title: 'AI Web Editor — Edit this element',
    contexts: ['all'],
  });
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

  return false;
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const btn = document.getElementById('awe-trigger-btn');
      if (btn) btn.click();
    },
  });
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
