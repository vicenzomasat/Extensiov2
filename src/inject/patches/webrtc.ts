
// src/inject/patches/webrtc.ts
import { maskFunction } from '../utils/native-mask';

export function patchWebRTC(mode: 'block' | 'relay' = 'block') {
  if (!window.RTCPeerConnection || (window as any).__psWrtcPatched__) return;
  (window as any).__psWrtcPatched__ = true;

  const ORTC = window.RTCPeerConnection;

  if (mode === 'block') {
    const Blocked = function() { throw new DOMException('NotAllowedError'); };
    Blocked.prototype = ORTC.prototype;
    Object.assign(Blocked, ORTC);

    window.RTCPeerConnection = Blocked as any;
    maskFunction(window.RTCPeerConnection, ORTC);

    if (navigator.mediaDevices?.getUserMedia) {
      const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('NotAllowedError'));
      maskFunction(navigator.mediaDevices.getUserMedia, gum);
    }
    return;
  }

  const P = ORTC.prototype;
  const origCreateOffer = P.createOffer;

  // Patch createOffer
  P.createOffer = async function(this: RTCPeerConnection, ...args: any[]) {
      // Cast 'this' safely
      const self = this;
      // original method might expect specific args
      const desc = await origCreateOffer.apply(self, args as any);
      if (desc && desc.sdp) {
          desc.sdp = desc.sdp.split('\r\n').filter((l: string) => !/^a=candidate:.* (host|srflx) /i.test(l)).join('\r\n');
      }
      return desc;
  } as any;
  maskFunction(P.createOffer, origCreateOffer);

  const origAddIce = P.addIceCandidate;
  P.addIceCandidate = function(this: RTCPeerConnection, cand: any, ...rest: any[]) {
    const s = (cand && (cand.candidate || cand)) || '';
    if (/ typ (host|srflx) /i.test(s)) return Promise.resolve();
    return origAddIce.call(this, cand, ...rest);
  } as any;
  maskFunction(P.addIceCandidate, origAddIce);
}
