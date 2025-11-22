export interface ProtectionSettings {
    enabled: boolean;
    spoofUserAgent: boolean;
    spoofTimezone: boolean;
    spoofWebGL: boolean;
    spoofCanvas: boolean;
    spoofAudio: boolean;
    preserveAuth: boolean;
    whitelistPatterns: string[];
    blacklistPatterns: string[];
    spoofScreen: boolean;
    spoofHardware: boolean;
    blockBattery: boolean;
    blockGamepad: boolean;
    blockWebRTC: boolean;
    blockFonts: boolean;
    detectFingerprinting: boolean;
    protectIframes: string;
    osPreference?: string;
    // New ones
    timingProtection?: boolean;
    cssFingerprint?: boolean;
    fontEnumeration?: boolean;
    audioFingerprint?: boolean;
    __sessionToken?: string;
}

export const DEFAULTS: ProtectionSettings = {
    enabled: true,
    spoofUserAgent: false,
    spoofTimezone: false,
    spoofWebGL: true,
    spoofCanvas: true,
    spoofAudio: true,
    preserveAuth: true,
    whitelistPatterns: [],
    blacklistPatterns: [],
    spoofScreen: false,
    spoofHardware: false,
    blockBattery: true,
    blockGamepad: true,
    blockWebRTC: true,
    blockFonts: false,
    detectFingerprinting: true,
    protectIframes: 'same-origin'
};
