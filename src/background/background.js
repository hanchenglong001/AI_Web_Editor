// AI Web Editor - Background Service Worker
// Handles AI API calls and manages extension state

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AI Web Editor] Installed');
  // Create context menu for quick access
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
    return true; // Keep message channel open for async response
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
  // Check for configured API key
  const result = await new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'apiProvider'], resolve);
  });

  const apiKey = result.apiKey;
  const provider = result.apiProvider || 'openai';

  if (!apiKey) {
    // No API key: return success with a flag so content script uses local fallback
    sendResponse({
      success: false,
      newContent: null,
      needsApiKey: true,
    });
    return;
  }

  try {
    let response;
    if (provider === 'openai' || provider === 'custom') {
      response = await callOpenAICompatible(command, elementText);
    } else if (provider === 'google') {
      response = await callGoogleGenerativeAI(command, elementText);
    } else {
      response = await callOpenAICompatible(command, elementText);
    }

    const content = extractAIContent(response);
    sendResponse({
      success: true,
      newContent: content,
    });
  } catch (err) {
    console.error('[AI Web Editor] API Error:', err);
    sendResponse({
      success: false,
      error: err.message || 'API request failed',
      needsApiKey: true,
    });
  }
}

async function callOpenAICompatible(command, elementText) {
  const baseUrl = chrome.runtime.getManifest().content_security_policy?.extension_pages || '';

  // Try OpenAI compatible endpoint (supports OpenAI, Together, Ollama, etc.)
  const systemPrompt = `You are a helpful AI that rewrites webpage content. 
The user has selected an element on a webpage and wants you to modify it.
Only return the NEW content for this element. Do NOT include markdown formatting like backticks or code blocks.
Do NOT explain your changes — just give me the modified text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${chrome.runtime.getManifest().content_security_policy ? '' : ''}`,
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
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  return response.json();
}

async function callGoogleGenerativeAI(command, elementText) {
  const apiKey = chrome.runtime.getManifest().content_security_policy ? '' : '';

  const systemPrompt = `You are a helpful AI that rewrites webpage content. 
Only return the NEW content. No explanations.`;

  // Note: This would need the actual API key from storage — simplified for MVP
  throw new Error('Google Generative AI integration pending');
}

function extractAIContent(response) {
  try {
    // OpenAI format
    if (response.choices && response.choices[0]?.message?.content) {
      let content = response.choices[0].message.content.trim();
      // Strip markdown code blocks if present
      content = content.replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim();
      return content;
    }
  } catch (e) {
    // Fallback
  }
  return null;
}
