// AI Web Editor - Background Service Worker v1.3
// Handles AI API calls, message routing, context menus, and extension lifecycle

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AWEditor] Installed v' + chrome.runtime.getManifest().version);

  // Create rich context menu with sub-items
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'awe-root',
      title: '🔷 AI Web Editor',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'awe-edit-element',
      title: '✨ Edit with AI',
      parentId: 'awe-root',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'awe-translate-zh',
      title: '🇨🇳 Translate to Chinese',
      parentId: 'awe-root',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'awe-translate-en',
      title: '🇺🇸 Translate to English',
      parentId: 'awe-root',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'awe-shorten',
      title: '✂️ Shorten content',
      parentId: 'awe-root',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'awe-open-in-panel',
      title: '📋 Open in AI Editor Panel',
      parentId: 'awe-root',
      contexts: ['all'],
    });
  });

  // Initialize defaults
  chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl', 'model', 'dailyLimit', 'hasOnboarded'], (result) => {
    if (!result.apiProvider) {
      chrome.storage.sync.set({ apiProvider: 'openai' }, () => {});
    }
    if (!result.model) {
      chrome.storage.sync.set({ model: 'gpt-4o-mini' }, () => {});
    }
    if (result.dailyLimit === undefined) {
      chrome.storage.sync.set({ dailyLimit: 50 }, () => {});
    }
    // Reset daily counter if new day
    const today = new Date().toDateString();
    chrome.storage.local.get(['lastReset', 'dailyUsage'], (local) => {
      if (local.lastReset !== today) {
        chrome.storage.local.set({ lastReset: today, dailyUsage: 0 }, () => {});
      }
    });
  });
});

// Handle context menu clicks with rich element data
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId || !info.menuItemId.startsWith('awe-')) return;

  switch (info.menuItemId) {
    case 'awe-edit-element':
    case 'awe-translate-zh':
    case 'awe-translate-en':
    case 'awe-shorten':
      // Extract element data from the page
      const elements = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selectionInfo) => {
          // Try to find if there's a highlighted/selected element via outline
          let target = null;
          // First check for outlined elements (from our selection mode)
          const outlined = document.querySelectorAll('[style*="outline"]');
          if (outlined.length > 0) {
            target = outlined[0];
          } else {
            // Otherwise try the element at click point via event.target is not available,
            // so we use the first visible text element as fallback
            const allEls = document.querySelectorAll('div, span, p, h1, h2, h3, li, td, th, a, button');
            for (const el of allEls) {
              const txt = (el.textContent || '').trim();
              if (txt.length > 0 && !el.closest('#awe-editor-panel') && !el.closest('#awe-trigger-btn')) {
                target = el;
                break;
              }
            }
          }
          if (!target) return null;

          const cs = window.getComputedStyle(target);
          const rect = target.getBoundingClientRect();

          return {
            text: (target.textContent || '').trim().substring(0, 500),
            tag: target.tagName.toLowerCase(),
            html: target.innerHTML.substring(0, 3000),
            isHtml: target.innerHTML.trim() !== (target.textContent || '').trim(),
            xpath: getXPath(target),
            className: target.className || '',
            id: target.id || '',
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            color: cs.color,
            backgroundColor: cs.backgroundColor,
          };
        },
      });

      const elemData = elements?.[0]?.result;
      if (elemData) {
        // Store element data for the content script to pick up
        chrome.storage.local.set({ _awe_context_menu_data: elemData }, () => {
          // Notify content script that context menu was used
          chrome.tabs.sendMessage(tab.id, { action: 'context-menu-trigger', command: info.menuItemId }).catch(() => {});
          // Open the editor panel if it exists in this tab
          chrome.tabs.sendMessage(tab.id, { action: 'open-editor-from-context' }).catch(() => {});
        });
      }

      // Also open the trigger button to show the panel
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const btn = document.getElementById('awe-trigger-btn');
          if (btn) btn.click();
        },
      }).catch(() => {});
      break;

    case 'awe-open-in-panel':
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const btn = document.getElementById('awe-trigger-btn');
          if (btn) btn.click();
          // Force panel open
          const panel = document.getElementById('awe-editor-panel');
          if (panel && !panel.classList.contains('active')) {
            panel.classList.add('active');
          }
        },
      });
      break;
  }
});

// Message routing from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'ai-modify':
      handleAIModify(message.command, message.elementText, message.elementTag, message.isHtml, sendResponse);
      return true; // async

    case 'save-api-key':
      chrome.storage.sync.set({ apiKey: message.apiKey }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'save-settings':
      chrome.storage.sync.set(message.settings, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'get-settings':
      chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl', 'model'], (result) => {
        sendResponse(result);
      });
      return true;

    case 'check-daily-limit':
      checkDailyLimit(sendResponse);
      return true;

    case 'increment-usage':
      incrementDailyUsage(sendResponse);
      return true;

    case 'reset-daily':
      chrome.storage.local.set({ dailyUsage: 0, lastReset: new Date().toDateString() }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'get-daily-usage':
      getDailyUsage(sendResponse);
      return true;

    case 'test-connection':
      testConnection(message.apiKey, message.provider, message.baseUrl || '', message.model || 'gpt-4o-mini', sendResponse);
      return true;

    case 'apply-html-modification':
      // Content script requests to apply HTML change from context menu AI edit
      chrome.storage.local.set({ _awe_pending_html: message.html }, () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action: ' + message.action });
  }
});

// ============================================================
// AI Modification Handler
// ============================================================

async function handleAIModify(command, elementText, elementTag, isHtml, sendResponse) {
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl', 'model'], resolve);
  });

  // Check daily limit
  const usageInfo = await getDailyUsageSync();
  if (usageInfo.usage >= usageInfo.limit) {
    sendResponse({
      success: false,
      error: 'Daily usage limit reached (' + usageInfo.limit + '/day)',
      limitReached: true,
    });
    return;
  }

  if (!settings.apiKey) {
    sendResponse({ success: false, needsApiKey: true });
    return;
  }

  try {
    let newContent;
    if (settings.apiProvider === 'custom' && settings.apiBaseUrl) {
      newContent = await callCustomAPI(settings.apiBaseUrl, settings.model || 'gpt-4o-mini', command, elementText, isHtml);
    } else {
      newContent = await callOpenAICompatible(
        settings.apiKey,
        settings.model || 'gpt-4o-mini',
        command,
        elementText,
        isHtml
      );
    }

    // Increment usage counter
    incrementDailyUsage(() => {});

    sendResponse({ success: true, newContent });
  } catch (err) {
    console.error('[AWEditor] API Error:', err);
    sendResponse({
      success: false,
      error: err.message || 'API request failed',
      needsApiKey: true,
    });
  }
}

// ============================================================
// API Calling Functions
// ============================================================

async function callOpenAICompatible(apiKey, model, command, elementText, isHtml) {
  const systemPrompt = isHtml
    ? 'You are an HTML/CSS assistant. The user wants to modify a webpage element.\nOnly return the NEW HTML for this element. Do NOT wrap in markdown code blocks.'
    : 'You are a helpful AI that rewrites webpage content.\nOnly return the NEW text content for this element. Do NOT include markdown formatting like backticks or code blocks.\nDo NOT explain your changes — just give me the modified text.';

  const userPrompt = `Command: "${command}"\n\nCurrent content:\n${elementText || '(empty element)'}\n\nPlease rewrite this according to the command.`;

  // Retry with backoff
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        if (response.status === 429) {
          throw new Error('Rate limited — please wait a moment');
        }
        throw new Error(`API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      return extractAIContent(data);

    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        await sleep(1500 * Math.pow(2, attempt));
      }
    }
  }

  throw lastErr || new Error('All retry attempts failed');
}

async function callCustomAPI(baseUrl, model, command, elementText, isHtml) {
  const systemPrompt = isHtml
    ? 'You are an HTML/CSS assistant. Only return the NEW HTML for this element. No markdown code blocks.'
    : 'You are a helpful AI that rewrites webpage content. Only return the NEW text. No explanations, no markdown.';

  const userPrompt = `Command: "${command}"\n\nCurrent content:\n${elementText || '(empty)'}\n\nPlease rewrite this according to the command.`;

  // Try OpenAI-compatible format first
  let apiUrl = baseUrl.endsWith('/v1/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  // Ollama sometimes uses /api/chat
  if (baseUrl.includes('ollama') || baseUrl.includes('localhost')) {
    try {
      const ollamaUrl = baseUrl.endsWith('/chat') || baseUrl.endsWith('/api/chat')
        ? baseUrl
        : `${baseUrl}/api/chat`;
      const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          max_tokens: 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return (data.message?.content || '').trim()
          .replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim();
      }
    } catch (_) {
      // Fall through to OpenAI-compatible format
    }
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Custom API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();

  // OpenAI-compatible format
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content.trim()
      .replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim();
  }
  // Anthropic format
  if (data.content?.[0]?.text) {
    return data.content[0].text.trim();
  }

  throw new Error('Unexpected API response format');
}

function extractAIContent(response) {
  try {
    const content = response.choices?.[0]?.message?.content;
    if (content) {
      return content.trim().replace(/^```[\w]*\n?/i, '').replace(/```$/i, '').trim();
    }
  } catch (_) {}
  return null;
}

// ============================================================
// Daily Usage Limits
// ============================================================

function getDailyUsageSync() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['dailyUsage', 'lastReset'], (local) => {
      const today = new Date().toDateString();
      if (local.lastReset !== today) {
        resolve({ usage: 0, limit: 50 });
      } else {
        chrome.storage.sync.get(['dailyLimit'], (sync) => {
          resolve({ usage: local.dailyUsage || 0, limit: sync.dailyLimit || 50 });
        });
      }
    });
  });
}

function checkDailyLimit(sendResponse) {
  getDailyUsageSync().then((info) => {
    sendResponse(info);
  });
}

function incrementDailyUsage(callback) {
  chrome.storage.local.get(['dailyUsage', 'lastReset'], (local) => {
    const today = new Date().toDateString();
    if (local.lastReset !== today) {
      chrome.storage.local.set({ dailyUsage: 1, lastReset: today }, callback);
    } else {
      chrome.storage.local.set({ dailyUsage: (local.dailyUsage || 0) + 1 }, callback);
    }
  });
}

function getDailyUsage(sendResponse) {
  getDailyUsageSync().then((info) => {
    chrome.storage.sync.get(['dailyLimit'], (sync) => {
      sendResponse({ ...info, limit: sync.dailyLimit || 50 });
    });
  });
}

// ============================================================
// Connection Test
// ============================================================

async function testConnection(apiKey, provider, baseUrl, model, sendResponse) {
  try {
    if (provider === 'custom' && baseUrl) {
      // Try calling the custom endpoint
      const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "ok" in one word.' }],
          max_tokens: 10,
        }),
      });

      if (resp.ok) {
        sendResponse({ success: true, provider: 'custom' });
      } else {
        const errText = await resp.text().catch(() => '');
        sendResponse({ success: false, error: `HTTP ${resp.status}: ${errText.substring(0, 200)}` });
      }
    } else {
      // Test OpenAI endpoint
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "ok" in one word.' }],
          max_tokens: 10,
        }),
      });

      if (resp.ok) {
        sendResponse({ success: true, provider: 'openai' });
      } else {
        const errText = await resp.text().catch(() => '');
        sendResponse({ success: false, error: `HTTP ${resp.status}: ${errText.substring(0, 200)}` });
      }
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message || 'Network error' });
  }
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
