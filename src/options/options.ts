
import { ProtectionSettings, DEFAULTS } from '../utils/settings';

// Helper to get element typed
function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULTS as any, (data) => {
    // Cast to unknown first to avoid "neither type sufficiently overlaps" error
    const settings = (data as unknown) as ProtectionSettings;

    // Toggles
    const toggles = [
      'enabled', 'spoofCanvas', 'spoofWebGL', 'spoofAudio',
      'blockWebRTC', 'spoofScreen', 'spoofHardware',
      'blockBattery', 'blockFonts'
    ];

    toggles.forEach(id => {
      const el = getEl<HTMLInputElement>(id);
      if (el) {
        el.checked = (settings as any)[id];
      }
    });

    renderList('whitelist-container', settings.whitelistPatterns, 'whitelist');
    renderList('blacklist-container', settings.blacklistPatterns, 'blacklist');
  });
}

function saveSetting(key: string, value: any) {
  const update: any = {};
  update[key] = value;
  chrome.storage.sync.set(update, () => {
    loadSettings();
  });
}

function renderList(containerId: string, list: string[], type: 'whitelist' | 'blacklist') {
  const container = getEl(containerId);
  if (!container) return;

  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-list">No domains added</div>';
    return;
  }

  list.forEach(pattern => {
    const div = document.createElement('div');
    div.className = 'list-item';

    const span = document.createElement('span');
    span.textContent = pattern;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => removeFromList(pattern, type);

    div.appendChild(span);
    div.appendChild(removeBtn);
    container.appendChild(div);
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
      });
    }
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
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Toggles
  const toggles = document.querySelectorAll('input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      saveSetting(target.id, target.checked);
    });
  });

  // Whitelist Add
  const whiteInput = getEl<HTMLInputElement>('whitelist-input');
  const whiteBtn = getEl('whitelist-add-btn');
  if (whiteBtn && whiteInput) {
      whiteBtn.addEventListener('click', () => {
          addToList(whiteInput.value.trim(), 'whitelist');
          whiteInput.value = '';
      });
  }

  // Blacklist Add
  const blackInput = getEl<HTMLInputElement>('blacklist-input');
  const blackBtn = getEl('blacklist-add-btn');
  if (blackBtn && blackInput) {
      blackBtn.addEventListener('click', () => {
          addToList(blackInput.value.trim(), 'blacklist');
          blackInput.value = '';
      });
  }
});
