
// src/inject/patches/audio.ts
import { mulberry32 } from '../utils/prng';
import { maskFunction } from '../utils/native-mask';

export function patchAudio(originSeed: number) {
  if ((window as any).__psAudioPatched__) return;
  (window as any).__psAudioPatched__ = true;

  if (!window.AudioBuffer) return;

  const originalGetChannelData = AudioBuffer.prototype.getChannelData;

  AudioBuffer.prototype.getChannelData = function(channel) {
    const channelData = originalGetChannelData.call(this, channel);

    const bufferSeed = originSeed + this.length + this.sampleRate + channel;
    const localPrng = mulberry32(bufferSeed);

    const sampleCount = Math.min(20, channelData.length);

    for (let i = 0; i < sampleCount; i++) {
      const sampleIndex = Math.floor(localPrng() * channelData.length);
      const jitter = (localPrng() - 0.5) * 2e-7;
      channelData[sampleIndex] += jitter;
    }

    return channelData;
  };
  maskFunction(AudioBuffer.prototype.getChannelData, originalGetChannelData);
}

export function patchAudioAnalyser(originSeed: number) {
    if (!window.AnalyserNode || (window as any).__psAnalyserPatched__) return;
    (window as any).__psAnalyserPatched__ = true;

    const jitter = (arr: Float32Array | Uint8Array, salt: number) => {
      const local = mulberry32((originSeed ^ salt) >>> 0);
      for (let i = 0; i < arr.length; i += Math.max(1, (arr.length/32|0))) {
        arr[i] += (local() - 0.5) * 1e-3;
      }
    };

    const A = AnalyserNode.prototype;
    const gf = A.getFloatFrequencyData;
    if (gf) {
      A.getFloatFrequencyData = function(a){ gf.call(this, a); jitter(a, 0xF00D); };
      maskFunction(A.getFloatFrequencyData, gf);
    }
    const gb = A.getByteFrequencyData;
    if (gb) {
      A.getByteFrequencyData = function(a){ gb.call(this, a); jitter(a, 0xFACE); };
      maskFunction(A.getByteFrequencyData, gb);
    }
    const gt = A.getFloatTimeDomainData;
    if (gt) {
      A.getFloatTimeDomainData = function(a){ gt.call(this, a); jitter(a, 0xCAFE); };
      maskFunction(A.getFloatTimeDomainData, gt);
    }
}
