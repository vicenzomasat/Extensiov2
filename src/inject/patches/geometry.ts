
// src/inject/patches/geometry.ts
import { maskFunction } from '../utils/native-mask';

export function patchDOMGeometry() {
  if ((window as any).__psDOMGeometryPatched__) return;
  (window as any).__psDOMGeometryPatched__ = true;

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  const originalGetClientRects = Element.prototype.getClientRects;

  function roundTo05(value: number) {
    return Math.round(value * 2) / 2;
  }

  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.call(this);

    // We must return a DOMRect object, not a plain object, to pass instanceof checks.
    // However, DOMRect properties are readonly. We can create a new DOMRect.
    const newRect = new DOMRect(
        roundTo05(rect.x),
        roundTo05(rect.y),
        roundTo05(rect.width),
        roundTo05(rect.height)
    );
    return newRect;
  };
  maskFunction(Element.prototype.getBoundingClientRect, originalGetBoundingClientRect);

  Element.prototype.getClientRects = function() {
    const rects = originalGetClientRects.call(this);

    // We can't easily create a DOMRectList. It's not constructible.
    // But we can return a plain object that looks like it, or an Array.
    // Most sites just iterate.
    const roundedRects: any = [];
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        roundedRects.push(new DOMRect(
            roundTo05(rect.x),
            roundTo05(rect.y),
            roundTo05(rect.width),
            roundTo05(rect.height)
        ));
    }

    roundedRects.item = function(index: number) {
      return this[index] || null;
    };

    return roundedRects;
  };
  maskFunction(Element.prototype.getClientRects, originalGetClientRects);
}
