
// src/inject/patches/hardware.ts
import { maskFunction } from '../utils/native-mask';

export function patchBattery() {
  if ((window as any).__psBatteryPatched__) return;
  (window as any).__psBatteryPatched__ = true;

  try {
    // delete Navigator.prototype.getBattery; // TypeScript complains about read-only
    Object.defineProperty(Navigator.prototype, 'getBattery', {
      value: undefined,
      configurable: false,
      writable: false
    });
  } catch {}

  try {
    // delete Navigator.prototype.battery;
    Object.defineProperty(Navigator.prototype, 'battery', {
      get: () => undefined,
      configurable: false
    });
  } catch {}

  try {
    delete (navigator as any).getBattery;
    delete (navigator as any).battery;
  } catch {}
}

export function patchNavigatorHardware() {
  if ((window as any).__psNavHardwarePatched__) return;
  (window as any).__psNavHardwarePatched__ = true;

  if ('deviceMemory' in navigator) {
    try {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        enumerable: true,
        configurable: true
      });
    } catch {}
  }

  if ('hardwareConcurrency' in navigator) {
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4,
        enumerable: true,
        configurable: true
      });
    } catch {}
  }
}
