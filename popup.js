// popup.js - Aligns with the actual popup.html structure

// Update status badge display
function updateStatus(enabled) {
  const statusElement = document.getElementById('status');
  if (enabled) {
    statusElement.textContent = '🟢 ACTIVE';
    statusElement.className = 'status active';
  } else {
    statusElement.textContent = '⚫ INACTIVE';
    statusElement.className = 'status inactive';
  }
}

// Load statistics from storage
function loadStatistics() {
  chrome.storage.local.get(['detectionHistory'], (result) => {
    const history = result.detectionHistory || [];

    // Filter last 24 hours
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recent = history.filter(d => d.timestamp > dayAgo);

    // Calculate stats
    const totalEvents = recent.length;
    const highSeverity = recent.filter(d =>
      d.severity === 'High' || d.severity === 'Critical'
    ).length;

    // Update UI
    document.getElementById('totalEvents').textContent = totalEvents;
    document.getElementById('highSeverity').textContent = highSeverity;
  });
}

// Load whitelist and display
function loadWhitelist() {
  chrome.storage.sync.get(['whitelistPatterns'], (result) => {
    const patterns = result.whitelistPatterns || [];
    const container = document.getElementById('whitelistItems');

    if (patterns.length === 0) {
      container.innerHTML = '<div style="color: #666; text-align: center; padding: 10px; font-size: 12px;">No whitelisted domains</div>';
      return;
    }

    container.innerHTML = patterns.map(pattern => `
      <div class="whitelist-item">
        <span>${pattern}</span>
        <button data-pattern="${pattern}">×</button>
      </div>
    `).join('');

    // Add remove handlers
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const pattern = btn.getAttribute('data-pattern');
        removeFromWhitelist(pattern);
      });
    });
  });
}

// Add domain to whitelist
function addToWhitelist(domain) {
  if (!domain || domain.trim() === '') return;

  chrome.storage.sync.get(['whitelistPatterns'], (result) => {
    const patterns = result.whitelistPatterns || [];

    // Avoid duplicates
    if (patterns.includes(domain)) {
      return;
    }

    patterns.push(domain);

    chrome.storage.sync.set({ whitelistPatterns: patterns }, () => {
      loadWhitelist();

      // Reload current tab if it matches
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          try {
            const url = new URL(tabs[0].url);
            if (url.hostname === domain || url.hostname.endsWith('.' + domain.replace('*.', ''))) {
              chrome.tabs.reload(tabs[0].id);
            }
          } catch (e) {}
        }
      });
    });
  });
}

// Remove domain from whitelist
function removeFromWhitelist(pattern) {
  chrome.storage.sync.get(['whitelistPatterns'], (result) => {
    const patterns = (result.whitelistPatterns || []).filter(p => p !== pattern);

    chrome.storage.sync.set({ whitelistPatterns: patterns }, () => {
      loadWhitelist();

      // Reload current tab if it matches
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          try {
            const url = new URL(tabs[0].url);
            if (url.hostname === pattern || url.hostname.endsWith('.' + pattern.replace('*.', ''))) {
              chrome.tabs.reload(tabs[0].id);
            }
          } catch (e) {}
        }
      });
    });
  });
}

// Save settings and reload tab
function saveSettings(settings) {
  chrome.storage.sync.set(settings, () => {
    // Reload current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Load all settings
  chrome.storage.sync.get([
    'enabled',
    'spoofCanvas',
    'spoofWebGL',
    'spoofAudio',
    'blockWebRTC',
    'spoofScreen',
    'spoofHardware',
    'blockBattery',
    'blockFonts'
  ], (result) => {
    // Set defaults (matching inject.js defaults)
    const settings = {
      enabled: result.enabled !== false,
      spoofCanvas: result.spoofCanvas !== false,
      spoofWebGL: result.spoofWebGL !== false,
      spoofAudio: result.spoofAudio !== false,
      blockWebRTC: result.blockWebRTC !== false,
      spoofScreen: result.spoofScreen === true, // OFF by default
      spoofHardware: result.spoofHardware === true, // OFF by default
      blockBattery: result.blockBattery !== false,
      blockFonts: result.blockFonts !== false
    };

    // Update checkboxes
    Object.keys(settings).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        element.checked = settings[key];
      }
    });

    // Update status
    updateStatus(settings.enabled);
  });

  // Load statistics and whitelist
  loadStatistics();
  loadWhitelist();

  // Add change listeners to all checkboxes
  const settingIds = [
    'enabled',
    'spoofCanvas',
    'spoofWebGL',
    'spoofAudio',
    'blockWebRTC',
    'spoofScreen',
    'spoofHardware',
    'blockBattery',
    'blockFonts'
  ];

  settingIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        const settings = {};
        settingIds.forEach(settingId => {
          const el = document.getElementById(settingId);
          if (el) {
            settings[settingId] = el.checked;
          }
        });

        saveSettings(settings);

        // Update status if main toggle changed
        if (id === 'enabled') {
          updateStatus(element.checked);
        }
      });
    }
  });

  // Whitelist add button
  document.getElementById('addWhitelist').addEventListener('click', () => {
    const input = document.getElementById('whitelistInput');
    const domain = input.value.trim();

    if (domain) {
      addToWhitelist(domain);
      input.value = '';
    }
  });

  // Add on Enter key
  document.getElementById('whitelistInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addWhitelist').click();
    }
  });
});
