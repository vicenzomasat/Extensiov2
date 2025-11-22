
// src/inject/patches/others.ts
import { maskFunction } from '../utils/native-mask';
import { mulberry32, fnv1a } from '../utils/prng';

export function patchMatchMedia() {
  if (!window.matchMedia || (window as any).__psMMPatched__) return;
  (window as any).__psMMPatched__ = true;
  const orig = window.matchMedia.bind(window);

  const wrap = (mql: MediaQueryList, forcedMatches: boolean) => new Proxy(mql, {
    get(t, p, r) {
      if (p === 'matches' && forcedMatches != null) return forcedMatches;
      return Reflect.get(t, p, r);
    }
  });

  window.matchMedia = function(q) {
    const mql = orig(q);
    if (/prefers-color-scheme/i.test(q)) return wrap(mql, false);
    if (/prefers-reduced-motion/i.test(q)) return wrap(mql, false);
    return mql;
  };
  maskFunction(window.matchMedia, orig);
}

export function patchDPRAndVisualViewport() {
  if ((window as any).__psDPRPatched__) return;
  (window as any).__psDPRPatched__ = true;

  const quantize = (v: number) => Math.round(v * 2) / 2;

  try {
    const origDPR = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    const getter = () => quantize((origDPR?.get ? origDPR.get.call(window) : window.devicePixelRatio));
    Object.defineProperty(window, 'devicePixelRatio', { get: getter, configurable: true });
  } catch {}

  if (window.visualViewport && (window as any).VisualViewport) {
    const scaleDesc = Object.getOwnPropertyDescriptor((window as any).VisualViewport.prototype, 'scale');
    if (scaleDesc && scaleDesc.get) {
      Object.defineProperty((window as any).VisualViewport.prototype, 'scale', {
        get() { return quantize(scaleDesc.get!.call(this)); }
      });
    }
  }
}

export function patchFonts(originSeed: number) {
  if ((window as any).__psFontsPatched__) return;
  (window as any).__psFontsPatched__ = true;

  if (document.fonts && document.fonts.check) {
    const origCheck = document.fonts.check.bind(document.fonts);
    document.fonts.check = function(fontSpec, text) {
      try {
        const spec = String(fontSpec || '');
        const isGeneric = /\b(monospace|serif|sans-serif)\b/i.test(spec);
        return isGeneric ? true : false;
      } catch { return false; }
    };
    maskFunction(document.fonts.check, origCheck);
  }

  if (CanvasRenderingContext2D.prototype.measureText) {
    const origMeasure = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function(txt) {
      const m = origMeasure.call(this, txt);
      const q = (v: number) => Math.round(v * 2) / 2;
      return new Proxy(m, {
        get(t, p, r) {
          if (p === 'width') return q(Reflect.get(t, p, r) as number);
          return Reflect.get(t, p, r);
        }
      });
    };
    maskFunction(CanvasRenderingContext2D.prototype.measureText, origMeasure);
  }
}
