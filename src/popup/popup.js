// AI Web Editor - Popup JS

document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const apiBaseUrlInput = document.getElementById('apiBaseUrl');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('apiStatus');

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'apiProvider', 'apiBaseUrl'], (result) => {
    if (result.apiProvider) providerSelect.value = result.apiProvider;
    if (result.apiBaseUrl) apiBaseUrlInput.value = result.apiBaseUrl;
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

    if (provider === 'custom' && !baseUrl) {
      statusEl.textContent = '● Error: Base URL required for Custom provider';
      statusEl.className = 'status disconnected';
      return;
    }

    if (!apiKey) {
      // Allow saving without key — will use local fallback
      await chrome.storage.sync.set({
        apiKey: '',
        apiProvider: provider,
        apiBaseUrl: baseUrl || '',
      });
      statusEl.textContent = '● Saved (local mode only)';
      statusEl.className = 'status disconnected';
      return;
    }

    // Save and verify by sending a message to background
    await chrome.storage.sync.set({
      apiKey,
      apiProvider: provider,
      apiBaseUrl: baseUrl || '',
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
        statusEl.textContent = '● Connected — API ready';
        statusEl.className = 'status connected';
        showToast('API connected successfully!', true);
      } else {
        // Still save — connection might work but test failed
        statusEl.textContent = '● Saved (use in extension)';
        statusEl.className = 'status disconnected';
      }
    } catch (err) {
      console.log('[Popup] Could not verify:', err);
      statusEl.textContent = '● Saved (use in extension)';
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
});
