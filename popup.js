// AI Web Editor — Popup v1.1
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const providerEl = document.getElementById('provider');
  const baseUrlEl = document.getElementById('apiBaseUrl');
  const apiKeyEl = document.getElementById('apiKeyInput');
  const modelEl = document.getElementById('modelInput');
  const limitEl = document.getElementById('dailyLimitInput');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetUsageBtn');
  const statusEl = document.getElementById('apiStatus');
  const versionEl = document.getElementById('version-display');

  // Show manifest version
  versionEl.textContent = 'v' + chrome.runtime.getManifest().version;

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl', 'model', 'dailyLimit'], (result) => {
    if (result.apiProvider) providerEl.value = result.apiProvider;
    if (result.apiBaseUrl) baseUrlEl.value = result.apiBaseUrl;
    if (result.model) modelEl.value = result.model;
    if (result.dailyLimit !== undefined) limitEl.value = result.dailyLimit;
    if (result.apiKey) {
      apiKeyEl.placeholder = '(key saved)';
      statusEl.innerHTML = '<span class="status-dot connected"></span>Connected — API ready';
    }
  });

  // Show/hide base URL field
  providerEl.addEventListener('change', () => {
    baseUrlEl.parentElement.style.display = providerEl.value === 'custom' ? 'block' : 'none';
  });
  // Initial state
  baseUrlEl.parentElement.style.display = 'none';

  // Load usage stats
  chrome.runtime.sendMessage({ action: 'get-daily-usage' }, (response) => {
    if (response) {
      document.getElementById('u-calls').textContent = response.usage;
      document.getElementById('u-limit').textContent = response.limit;
      document.getElementById('u-remain').textContent = Math.max(0, response.limit - response.usage);
    }
  });

  // Save & Test connection
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyEl.value.trim();
    const provider = providerEl.value;
    const baseUrl = baseUrlEl.value.trim();
    const model = modelEl.value.trim() || 'gpt-4o-mini';
    const dailyLimit = parseInt(limitEl.value) || 50;

    if (provider === 'custom' && !baseUrl) {
      statusEl.innerHTML = '<span class="status-dot disconnected"></span>Error: Base URL required';
      return;
    }

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    // Save settings first
    chrome.storage.sync.set({ apiKey, apiProvider: provider, apiBaseUrl: baseUrl || '', model, dailyLimit }, () => {
      statusEl.innerHTML = '<span class="status-dot disconnected"></span>Saved — restart extension to apply';
    });

    // If API key provided, test connection in background
    if (apiKey) {
      chrome.runtime.sendMessage({
        action: 'test-connection',
        apiKey, provider, baseUrl, model,
      }, (response) => {
        if (response?.success) {
          statusEl.innerHTML = '<span class="status-dot connected"></span>Connected — API ready';
          showToast('API 连接成功！', true);
        } else {
          const err = response?.error || 'Unknown error';
          statusEl.innerHTML = `<span class="status-dot disconnected"></span>Error: ${err.substring(0, 80)}`;
          // Still saved — connection might work but test endpoint differs
        }
        saveBtn.textContent = 'Save & Test Connection';
        saveBtn.disabled = false;
      });
    } else {
      statusEl.innerHTML = '<span class="status-dot disconnected"></span>Saved (local mode only)';
      saveBtn.textContent = 'Save & Test Connection';
      saveBtn.disabled = false;
    }
  });

  // Reset usage counter
  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'reset-daily' }, () => {
      document.getElementById('u-calls').textContent = '0';
      const remaining = parseInt(limitEl.value) || 50;
      document.getElementById('u-remain').textContent = remaining;
      showToast('Usage counter reset', true);
    });
  });

  // About link → open GitHub
  document.getElementById('aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/hanchenglong001/AI_Web_Editor' });
  });

  function showToast(msg, success) {
    const existing = document.getElementById('popup-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'popup-toast';
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:12px;left:50%;transform:translateX(-50%);padding:8px 16px;background:${success?'#22c55e':'#ef4444'};color:white;border-radius:8px;font-size:12px;z-index:999;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
});
