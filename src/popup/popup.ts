
import { ProtectionSettings, DEFAULTS } from '../utils/settings';

const statusElement = document.getElementById('status');
const advancedToggle = document.getElementById('advanced-toggle');
const advancedOptions = document.getElementById('advanced-options');

function updateStatus(enabled: boolean) {
    if (statusElement) {
        statusElement.textContent = enabled ? 'Protection Active' : 'Protection Disabled';
        statusElement.className = enabled ? 'status-active' : 'status-inactive';
    }

    // Update icon logic: 'g' suffix seems to be 'golden' (enabled), plain might be black/disabled?
    // Checking file list: 48.png and 48g.png.
    // Assuming 'g' is active (gold).
    const iconPath = enabled ? 'icons/Logo/48g.png' : 'icons/Logo/48.png';
    if (chrome.action) {
        chrome.action.setIcon({ path: iconPath });
    }
}

// ... rest of the file
function getCurrentTab(callback: (tab: chrome.tabs.Tab) => void) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      callback(tabs[0]);
    }
  });
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function renderList(containerId: string, list: string[], type: 'whitelist' | 'blacklist') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-list">Empty</div>';
    return;
  }

  list.forEach(pattern => {
    const div = document.createElement('div');
    div.className = 'list-item';

    const span = document.createElement('span');
    span.textContent = pattern;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeFromList(pattern, type);

    div.appendChild(span);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
}

function removeFromList(pattern: string, type: 'whitelist' | 'blacklist') {
  chrome.storage.sync.get(DEFAULTS as any, (data) => {
    const settings = (data as unknown) as ProtectionSettings;
    if (type === 'whitelist') {
      settings.whitelistPatterns = settings.whitelistPatterns.filter(p => p !== pattern);
    } else {
      settings.blacklistPatterns = settings.blacklistPatterns.filter(p => p !== pattern);
    }

    chrome.storage.sync.set(settings as any, () => {
      loadSettings();
      reloadCurrentTab();
    });
  });
}

function addToList(pattern: string, type: 'whitelist' | 'blacklist') {
  if (!pattern) return;

  chrome.storage.sync.get(DEFAULTS as any, (data) => {
    const settings = (data as unknown) as ProtectionSettings;
    const list = type === 'whitelist' ? settings.whitelistPatterns : settings.blacklistPatterns;

    if (!list.includes(pattern)) {
      list.push(pattern);

      chrome.storage.sync.set(settings as any, () => {
        loadSettings();
        reloadCurrentTab();
      });
    }
  });
}

function reloadCurrentTab() {
  getCurrentTab((tab) => {
    if (tab.id) {
        chrome.tabs.reload(tab.id);
    }
  });
}

function updateCurrentSiteStatus() {
  getCurrentTab((tab) => {
    const hostname = getHostname(tab.url || '');
    const siteStatusEl = document.getElementById('site-status');
    const addWhitelistBtn = document.getElementById('add-whitelist');
    const addBlacklistBtn = document.getElementById('add-blacklist');

    if (!hostname || !siteStatusEl) return;

    chrome.storage.sync.get(DEFAULTS as any, (data) => {
      const settings = (data as unknown) as ProtectionSettings;

      const inWhitelist = settings.whitelistPatterns.some(p => {
          if (p.startsWith('*.')) return hostname.endsWith(p.slice(1));
          return hostname === p;
      });
      const inBlacklist = settings.blacklistPatterns.some(p => {
           if (p.startsWith('*.')) return hostname.endsWith(p.slice(1));
           return hostname === p;
      });

      if (inBlacklist) {
        siteStatusEl.textContent = `${hostname} is in Blacklist`;
        siteStatusEl.className = 'status-blocked';
        if (addBlacklistBtn) addBlacklistBtn.style.display = 'none';
        if (addWhitelistBtn) addWhitelistBtn.style.display = 'block';
      } else if (inWhitelist) {
        siteStatusEl.textContent = `${hostname} is in Whitelist`;
        siteStatusEl.className = 'status-trusted';
        if (addWhitelistBtn) addWhitelistBtn.style.display = 'none';
        if (addBlacklistBtn) addBlacklistBtn.style.display = 'block';
      } else {
        siteStatusEl.textContent = `${hostname} is Protected (Default)`;
        siteStatusEl.className = 'status-default';
        if (addWhitelistBtn) addWhitelistBtn.style.display = 'block';
        if (addBlacklistBtn) addBlacklistBtn.style.display = 'block';
      }

      if (addWhitelistBtn) addWhitelistBtn.onclick = () => addToList(hostname, 'whitelist');
      if (addBlacklistBtn) addBlacklistBtn.onclick = () => addToList(hostname, 'blacklist');
    });
  });
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULTS as any, (data) => {
    const settings = (data as unknown) as ProtectionSettings;

    updateStatus(settings.enabled);

    const toggles = [
      'enabled', 'spoofCanvas', 'spoofWebGL', 'spoofAudio',
      'blockWebRTC', 'spoofScreen', 'spoofHardware',
      'blockBattery', 'blockFonts'
    ];

    toggles.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.checked = (settings as any)[id];
      }
    });

    updateCurrentSiteStatus();
  });
}

function saveSetting(key: string, value: any) {
  const update: any = {};
  update[key] = value;
  chrome.storage.sync.set(update, () => {
    loadSettings();
    reloadCurrentTab();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const toggles = document.querySelectorAll('input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      saveSetting(target.id, target.checked);
    });
  });

  if (advancedToggle && advancedOptions) {
      advancedToggle.addEventListener('click', () => {
          if (advancedOptions.style.display === 'none' || !advancedOptions.style.display) {
              advancedOptions.style.display = 'block';
              advancedToggle.textContent = 'Hide Advanced Options';
          } else {
              advancedOptions.style.display = 'none';
              advancedToggle.textContent = 'Show Advanced Options';
          }
      });
  }

  const addInput = document.getElementById('quick-add-input') as HTMLInputElement;
  const addBtn = document.getElementById('quick-add-btn');

  if (addInput && addBtn) {
    addBtn.addEventListener('click', () => {
      const val = addInput.value.trim();
      if (val) {
        addToList(val, 'whitelist');
        addInput.value = '';
      }
    });
  }

  const openOptionsBtn = document.getElementById('open-options');
  if (openOptionsBtn) {
      openOptionsBtn.addEventListener('click', () => {
          if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            window.open(chrome.runtime.getURL('options.html'));
          }
      });
  }
});
