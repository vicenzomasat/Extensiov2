
import { ProtectionSettings, DEFAULTS } from './utils/settings';

(function() {
  'use strict';

  if ((window as any).__PS_CS_INITIALIZED__) return;
  (window as any).__PS_CS_INITIALIZED__ = true;

  const BUILTIN_TRUSTED = [
    "accounts.google.com",
    "login.microsoftonline.com", 
    "auth0.com",
    "okta.com",
    "login.yahoo.com",
    "secure.bankofamerica.com",
    "chase.com",
    "wellsfargo.com",
    "paypal.com",
    "amazon.com"
  ];

  class SecureMessageBridge {
    sessionToken: string;
    pending: Map<string, {resolve: Function, reject: Function}>;
    handlers: Map<string, Function>;

    constructor(sessionToken: string) {
      this.sessionToken = sessionToken;
      this.pending = new Map();
      this.handlers = new Map();
      this.setupListeners();
    }

    setupListeners() {
      window.addEventListener('message', (e) => {
        if (e.source !== window) return;
        
        const isFileProtocol = location.protocol === 'file:';
        if (!isFileProtocol && e.origin !== window.location.origin) return;
        if (isFileProtocol && e.origin !== 'null') return;
        
        const data = e.data;
        if (!data || typeof data !== 'object') return;
        if (!data.type?.startsWith('PS_')) return;
        
        if (data.__psToken !== this.sessionToken) return;

        // console.log('[Privacy Shield CS] Received message:', data.type);

        switch(data.type) {
          case 'PS_RESPONSE':
            this.handleResponse(data);
            break;
          case 'PS_EVENT':
            this.handleEvent(data);
            break;
          case 'PS_ACK':
            this.handleAck(data);
            break;
          case 'PS_REQUEST':
            this.handleRequest(data);
            break;
        }
      });
    }

    handleResponse(data: any) {
      const promise = this.pending.get(data.id);
      if (promise) {
        promise.resolve(data.payload);
        this.pending.delete(data.id);
      }
    }

    handleEvent(data: any) {
      const handler = this.handlers.get(data.event);
      if (handler) {
        handler(data.payload);
      }

      if (data.event === 'fingerprinting_detected') {
        chrome.runtime.sendMessage({
          type: 'FINGERPRINTING_DETECTED',
          ...data.payload
        }).catch(() => {});
      }
    }

    handleAck(data: any) {
      const handler = this.handlers.get('ack_' + data.id);
      if (handler) {
        handler(true);
        this.handlers.delete('ack_' + data.id);
      }
    }

    async handleRequest(data: any) {
      switch(data.request) {
        case 'GET_PERSONA':
          try {
            const response = await chrome.runtime.sendMessage({
              type: 'GET_PERSONA',
              osPreference: data.payload?.osPreference
            });
            
            this.sendToPage('PS_RESPONSE', {
              id: data.id,
              payload: response
            });
          } catch(e: any) {
            this.sendToPage('PS_RESPONSE', {
              id: data.id,
              payload: { error: e.message }
            });
          }
          break;
          
        case 'LOG':
          console.log('[PS Main World]', ...data.payload);
          break;
      }
    }

    sendToPage(type: string, data: any) {
      const targetOrigin = location.protocol === 'file:' ? '*' : window.location.origin;
      window.postMessage({
        ...data,
        type,
        __psToken: this.sessionToken
      }, targetOrigin);
    }

    async request(type: string, payload: any, timeout = 5000) {
      const id = crypto.randomUUID();
      
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        
        this.sendToPage('PS_REQUEST', {
          id,
          request: type,
          payload
        });
        
        setTimeout(() => {
          if (this.pending.has(id)) {
            this.pending.delete(id);
            reject(new Error('Request timeout'));
          }
        }, timeout);
      });
    }

    on(event: string, handler: Function) {
      this.handlers.set(event, handler);
    }

    waitForAck(id: string, timeout = 300) {
      return new Promise((resolve) => {
        this.handlers.set('ack_' + id, resolve);
        setTimeout(() => {
          if (this.handlers.has('ack_' + id)) {
            this.handlers.delete('ack_' + id);
            resolve(false);
          }
        }, timeout);
      });
    }
  }

  class EnhancedInjectionManager {
    bridge: SecureMessageBridge;
    sessionToken: string;
    injected: boolean;

    constructor(bridge: SecureMessageBridge, sessionToken: string) {
      this.bridge = bridge;
      this.sessionToken = sessionToken;
      this.injected = false;
    }

    async inject(settings: any, whitelist: string[], blacklist: string[], persona: any) {
      if (this.injected) return true;

      const msgId = crypto.randomUUID();
      
      const enhancedSettings = {
        ...settings,
        __sessionToken: this.sessionToken,
        __persona: persona
      };
      
      // Try MV3 method first (most reliable)
      // Increased timeout to 2000ms to account for async script injection timing
      const mv3Success = await this.tryMV3Injection(enhancedSettings, whitelist, blacklist, msgId);
      if (mv3Success) {
        this.injected = true;
        return true;
      }

      // Disable fallbacks for now to prevent CSP errors breaking pages like DDG
      /*
      const blobSuccess = await this.tryBlobInjection(enhancedSettings, whitelist, blacklist, msgId);
      if (blobSuccess) {
        this.injected = true;
        return true;
      }

      const inlineSuccess = await this.tryInlineInjection(enhancedSettings, whitelist, blacklist, msgId);
      if (inlineSuccess) {
        this.injected = true;
        return true;
      }
      */

      console.warn('[Privacy Shield] MV3 injection failed (and fallbacks disabled)');
      return false;
    }

    prepareInjectionCode(injectCode: string, settings: any, whitelist: any[], blacklist: any[], msgId: string) {
        const settingsCode = `
          window._psSettings = ${JSON.stringify(settings)};
          window._psWhitelist = ${JSON.stringify(whitelist)};
          window._psBlacklist = ${JSON.stringify(blacklist)};
          window._psMsgId = ${JSON.stringify(msgId)};
        `;
        return settingsCode + '\n' + injectCode;
    }

    async tryMV3Injection(settings: any, whitelist: string[], blacklist: string[], msgId: string) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'INJECT_MAIN_WORLD',
          args: [settings, whitelist, blacklist, msgId]
        });

        if (response?.success) {
          // Increased timeout to 2000ms
          const acked = await this.bridge.waitForAck(msgId, 2000);
          return acked;
        }
      } catch(e) {
        console.debug('[Privacy Shield] MV3 injection failed:', e);
      }
      return false;
    }

    async tryBlobInjection(settings: any, whitelist: string[], blacklist: string[], msgId: string) {
       // ... (same as before, but unused now)
       return false;
    }

    async tryInlineInjection(settings: any, whitelist: string[], blacklist: string[], msgId: string) {
       // ... (same as before, but unused now)
       return false;
    }
  }

  // ... (rest of the file same as before)

  function normalizeHostPattern(raw: string) {
    if (typeof raw !== 'string') return null;
    
    let s = raw.trim().toLowerCase();
    
    try {
      if (s.includes('://')) {
        s = new URL(s).hostname.toLowerCase();
      }
    } catch {}
    
    s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    s = s.replace(/\s/g, '');
    
    if (!s) return null;
    
    if (s.startsWith('*.')) {
    } else if (s.startsWith('.')) {
      s = '*' + s;
    }
    
    if (s.length > 255) return null;
    if (s.slice(2).includes('*')) return null;
    
    return s;
  }

  function patternMatch(hostname: string, pattern: string) {
    if (!hostname || !pattern) return false;
    
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      return hostname === base || hostname.endsWith('.' + base);
    }
    
    return hostname === pattern;
  }

  function shouldProtect(hostname: string, whitelist: string[], blacklist: string[], preserveAuth: boolean) {
    const inBlacklist = blacklist.some(p => patternMatch(hostname, p));
    const inWhitelist = whitelist.some(p => patternMatch(hostname, p));
    
    if (inBlacklist) return true;
    if (preserveAuth && inWhitelist) return false;
    return true;
  }

  async function initialize() {
    const isIframe = window !== window.top;
    if (isIframe) {
      const settings = (await chrome.storage.sync.get(['protectIframes'])) as any;
      const policy = settings.protectIframes || 'same-origin';
      
      if (policy === 'top-only') {
        console.debug('[Privacy Shield] Skipping iframe (top-only policy)');
        return;
      }
      
      if (policy === 'same-origin') {
        try {
          const topHostname = window.top?.location.hostname;
          if (topHostname !== window.location.hostname) {
            console.debug('[Privacy Shield] Skipping cross-origin iframe');
            return;
          }
        } catch {
          console.debug('[Privacy Shield] Skipping cross-origin iframe');
          return;
        }
      }
    }

    const settings = (await chrome.storage.sync.get(DEFAULTS as any)) as ProtectionSettings;
    
    if (!settings.enabled) {
      console.log('[Privacy Shield] Extension disabled');
      return;
    }

    const whitelistRaw = [...(settings.whitelistPatterns || []), ...BUILTIN_TRUSTED];
    const whitelist = whitelistRaw
      .map(normalizeHostPattern)
      .filter((s): s is string => !!s);
    
    const uniqueWhitelist = Array.from(new Set(whitelist));
    
    const blacklistRaw = settings.blacklistPatterns || [];
    const blacklist = blacklistRaw
      .map(normalizeHostPattern)
      .filter((s): s is string => !!s);
    
    const uniqueBlacklist = Array.from(new Set(blacklist));

    const hostname = window.location.hostname.toLowerCase();
    const protect = shouldProtect(hostname, uniqueWhitelist, uniqueBlacklist, settings.preserveAuth);
    
    if (!protect) {
      console.log('[Privacy Shield] Site whitelisted, protection disabled');
      return;
    }

    const sessionToken = crypto.randomUUID();
    
    const bridge = new SecureMessageBridge(sessionToken);
    const injector = new EnhancedInjectionManager(bridge, sessionToken);

    let persona = null;
    try {
      persona = await chrome.runtime.sendMessage({
        type: 'GET_PERSONA',
        osPreference: settings.osPreference
      });
    } catch(e) {
      console.warn('[Privacy Shield] Failed to get persona:', e);
    }

    bridge.on('fingerprinting_detected', (data: any) => {
      console.log('[Privacy Shield] Fingerprinting detected:', data);
    });

    const injected = await injector.inject(settings, uniqueWhitelist, uniqueBlacklist, persona);
    
    if (injected) {
      console.log('[Privacy Shield] Protection active');
    } else {
      console.warn('[Privacy Shield] Failed to inject protection');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
