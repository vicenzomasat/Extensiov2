
// src/types/global.d.ts

interface Window {
  __PS_CS_INITIALIZED__?: boolean;
  __psPatched__?: boolean;
  __psCanvasPatched__?: boolean;
  __psAudioPatched__?: boolean;
  __psWebGLPatched__?: boolean;
  __psDOMGeometryPatched__?: boolean;
  __psBatteryPatched__?: boolean;
  __psNavHardwarePatched__?: boolean;
  __psWrtcPatched__?: boolean;
  __psTimingPatched__?: boolean;
  __psMMPatched__?: boolean;
  __psDPRPatched__?: boolean;
  __psFontsPatched__?: boolean;
  __psAnalyserPatched__?: boolean;

  // For pre-injection settings
  _psSettings?: any;
  _psWhitelist?: string[];
  _psBlacklist?: string[];
  _psMsgId?: string;

  initializeProtection?: Function;
}

interface Navigator {
  deviceMemory?: number;
}
