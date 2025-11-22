
// src/background.ts

import { ProtectionSettings, DEFAULTS } from './utils/settings';

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(DEFAULTS as any, (settings) => {
        const merged = { ...DEFAULTS, ...settings };
        chrome.storage.sync.set(merged);
    });
});

// Badge management
function updateBadge(count: number) {
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Store counts per tab
const tabCounts: {[tabId: number]: number} = {};

chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabCounts[tabId];
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PERSONA') {
        sendResponse({
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
        });
        return true;
    }

    if (message.type === 'FINGERPRINTING_DETECTED') {
        if (sender.tab && sender.tab.id) {
            const tabId = sender.tab.id;
            tabCounts[tabId] = (tabCounts[tabId] || 0) + 1;
            updateBadge(tabCounts[tabId]);
        }
        return true;
    }

    if (message.type === 'INJECT_MAIN_WORLD') {
        const [settings, whitelist, blacklist, msgId] = message.args || [];

        if (sender.tab && sender.tab.id) {
             const tabId = sender.tab.id;

             chrome.scripting.executeScript({
                 target: { tabId },
                 world: 'MAIN',
                 func: (settings: any, whitelist: any, blacklist: any, msgId: any) => {
                     (window as any)._psSettings = settings;
                     (window as any)._psWhitelist = whitelist;
                     (window as any)._psBlacklist = blacklist;
                     (window as any)._psMsgId = msgId;
                 },
                 args: [settings, whitelist, blacklist, msgId]
             }).then(() => {
                 return chrome.scripting.executeScript({
                     target: { tabId },
                     world: 'MAIN',
                     files: ['inject.js']
                 });
             }).then(() => {
                 sendResponse({ success: true });
             }).catch(err => {
                 console.error('Injection failed', err);
                 sendResponse({ success: false, error: err.message });
             });
             return true;
        }
    }
});

// Update badge when tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    const count = tabCounts[activeInfo.tabId] || 0;
    updateBadge(count);
});
