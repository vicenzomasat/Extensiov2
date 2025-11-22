
import { getOriginSeed } from './utils/prng';
import { patchCanvas } from './patches/canvas';
import { patchAudio, patchAudioAnalyser } from './patches/audio';
import { patchWebGL } from './patches/webgl';
import { patchDOMGeometry } from './patches/geometry';
import { patchBattery, patchNavigatorHardware } from './patches/hardware';
import { patchWebRTC } from './patches/webrtc';
import { patchTiming } from './patches/timing';
import { patchMatchMedia, patchDPRAndVisualViewport, patchFonts } from './patches/others';

// Prevent multiple initializations
if ((window as any).__psPatched__) {
    // Already patched
} else {
    (window as any).__psPatched__ = true;

    interface ProtectionSettings {
        enabled: boolean;
        spoofCanvas: boolean;
        spoofAudio: boolean;
        timingProtection: boolean;
        cssFingerprint: boolean;
        fontEnumeration: boolean;
        audioFingerprint: boolean;
        spoofWebGL: boolean;
        spoofScreen: boolean;
        spoofHardware: boolean;
        blockBattery: boolean;
        blockGamepad: boolean;
        blockWebRTC: boolean;
        __sessionToken?: string;
    }

    const originSeed = getOriginSeed();

    (window as any).initializeProtection = function(
        settings: ProtectionSettings,
        whitelist: string[],
        blacklist: string[],
        msgId: string
    ) {
        try {
            console.log('[Privacy Shield] Initializing with settings:', settings);
            if (!settings.enabled) {
                console.log('[Privacy Shield] Protection disabled in settings');
                return;
            }

            if (settings.spoofCanvas) patchCanvas(originSeed);
            if (settings.spoofAudio) patchAudio(originSeed);
            if (settings.timingProtection) patchTiming(originSeed);
            if (settings.cssFingerprint) {
                patchMatchMedia();
                patchDPRAndVisualViewport();
            }
            if (settings.fontEnumeration) patchFonts(originSeed);
            if (settings.audioFingerprint) patchAudioAnalyser(originSeed);

            if (settings.spoofWebGL) patchWebGL();
            if (settings.spoofHardware) patchNavigatorHardware();
            if (settings.blockBattery) patchBattery();

            if (settings.spoofScreen) {
                 patchDOMGeometry();
            }

            if (settings.blockWebRTC) patchWebRTC('block');

            console.log('[Privacy Shield] Protections applied based on settings');

            if (msgId) {
                window.postMessage({
                    type: 'PS_ACK',
                    id: msgId,
                    __psToken: settings.__sessionToken
                }, location.origin);
            }

        } catch (error) {
            console.error('[Privacy Shield] Error applying patches:', error);
        }
    };

    const globalSettings = (window as any)._psSettings;
    if (globalSettings) {
        (window as any).initializeProtection(globalSettings, (window as any)._psWhitelist, (window as any)._psBlacklist, (window as any)._psMsgId);
    }
}
