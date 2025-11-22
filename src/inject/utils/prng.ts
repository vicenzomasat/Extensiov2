
// src/inject/utils/prng.ts

// FNV1a hash for seed generation
export function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Deterministic PRNG implementation (mulberry32)
export function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Get deterministic origin-scoped seed
export function getOriginSeed(): number {
  try {
    return fnv1a(window.location.origin);
  } catch {
    return fnv1a('fallback-seed');
  }
}
