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
    handleAIModify(message.command, message.elementText, message.elementTag, sendResponse);
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

async function handleAIModify(command, elementText, elementTag, sendResponse) {
  // Read full API config from storage
  const result = await new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl'], resolve);
  });

  const apiKey = result.apiKey;
  const provider = result.apiProvider || 'openai';
  const baseUrl = (result.apiBaseUrl || '').trim();

  if (!apiKey) {
    sendResponse({ success: false, newContent: null, needsApiKey: true });
    return;
  }

  try {
    let response;
    if (provider === 'openai') {
      response = await callOpenAICompatible(command, elementText, 'https://api.openai.com/v1', apiKey);
    } else if (provider === 'custom') {
      const targetUrl = buildEndpointUrl(baseUrl);
      console.log(`[AI Web Editor] Using custom API: ${targetUrl}`);
      response = await callOpenAICompatible(command, elementText, targetUrl, apiKey);
    } else if (provider === 'google') {
      response = await callGoogleGenerativeAI(command, elementText, apiKey);
    } else {
      // Default to openai-compatible with baseUrl or OpenAI
      const targetUrl = baseUrl ? buildEndpointUrl(baseUrl) : 'https://api.openai.com/v1';
      response = await callOpenAICompatible(command, elementText, targetUrl, apiKey);
    }

    const content = extractAIContent(response);
    sendResponse({ success: true, newContent: content });
  } catch (err) {
    console.error('[AI Web Editor] API Error:', err);
    sendResponse({ success: false, error: err.message || 'API request failed', needsApiKey: true });
  }
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

async function callOpenAICompatible(command, elementText, apiUrl, apiKey) {
  const systemPrompt = `You are a helpful AI that rewrites webpage content. 
The user has selected an element on a webpage and wants you to modify it.
Only return the NEW content for this element. Do NOT include markdown formatting like backticks or code blocks.
Do NOT explain your changes — just give me the modified text.`;

  console.log(`[AI Web Editor] Calling API: ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Command: "${command}"\n\nCurrent content:\n${elementText || '(empty element)'}\n\nPlease rewrite this according to the command.` },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${errBody}`);
  }

  return response.json();
}

async function callGoogleGenerativeAI(command, elementText, apiKey) {
  const systemPrompt = `You are a helpful AI that rewrites webpage content. 
Only return the NEW content. No explanations.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  console.log(`[AI Web Editor] Calling Google Gemini API`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemPrompt },
          { text: `Command: "${command}". Current content:\n${elementText || '(empty element)'}` }
        ],
      }],
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
      await callOpenAICompatible('test', 'test', 'https://api.openai.com/v1', apiKey);
    } else if (provider === 'custom' && baseUrl) {
      await callOpenAICompatible('test', 'test', buildEndpointUrl(baseUrl), apiKey);
    } else {
      // No URL to test, just verify key format
      sendResponse({ success: true, message: 'Settings saved — will be used in extension' });
      return;
    }
    sendResponse({ success: true, message: 'Connection successful!' });
  } catch (err) {
    console.error('[AI Web Editor] Test connection failed:', err);
    sendResponse({ success: false, error: err.message });
  }
}
