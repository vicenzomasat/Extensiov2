
// src/inject/patches/timing.ts
import { mulberry32, getOriginSeed } from '../utils/prng';
import { maskFunction } from '../utils/native-mask';

export function patchTiming(originSeed: number) {
  if ((window as any).__psTimingPatched__) return;
  (window as any).__psTimingPatched__ = true;

  const RES_MS = 100;
  const originalNow = performance.now.bind(performance);
  const originalRAF = window.requestAnimationFrame.bind(window);
  const originalGetEntriesByType = performance.getEntriesByType.bind(performance);

  let cachedBucketStart: number | null = null;
  let cachedJitter: number | null = null;

  const getBucketizedTime = (rawTime: number, salt = 0) => {
    const currentBucket = Math.floor(rawTime / RES_MS) * RES_MS;

    if (cachedBucketStart !== currentBucket) {
      cachedBucketStart = currentBucket;
      const local = mulberry32((currentBucket ^ originSeed ^ salt) >>> 0);
      cachedJitter = Math.floor(local() * RES_MS);
    }

    return (cachedBucketStart || 0) + (cachedJitter || 0);
  };

  performance.now = function() {
    const original = originalNow();
    return getBucketizedTime(original, 0xA11CE);
  };
  maskFunction(performance.now, originalNow);

  window.requestAnimationFrame = function(cb) {
    return originalRAF(ts => {
      const bucketized = getBucketizedTime(ts, 0xBEEF);
      cb(bucketized);
    });
  };
  maskFunction(window.requestAnimationFrame, originalRAF);

  performance.getEntriesByType = function(type) {
    const entries = originalGetEntriesByType(type);
    return entries.map(e => new Proxy(e, {
      get(target, prop, recv) {
        if (prop === 'startTime' || prop === 'duration') {
          const raw = Reflect.get(target, prop, recv);
          if (typeof raw === 'number') {
             return getBucketizedTime(raw, prop === 'duration' ? 0xD00D : 0xC0DE);
          }
        }
        return Reflect.get(target, prop, recv);
      }
    }));
  };
  maskFunction(performance.getEntriesByType, originalGetEntriesByType);
}
