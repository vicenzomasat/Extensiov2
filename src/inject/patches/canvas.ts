
// src/inject/patches/canvas.ts
import { mulberry32, getOriginSeed, fnv1a } from '../utils/prng';
import { maskFunction } from '../utils/native-mask';

export function patchCanvas(originSeed: number) {
  if ((window as any).__psCanvasPatched__) return;
  (window as any).__psCanvasPatched__ = true;

  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  let originalOffscreenConvertToBlob: any;
  if (typeof OffscreenCanvas !== 'undefined') {
    originalOffscreenConvertToBlob = OffscreenCanvas.prototype.convertToBlob;
  }

  function addCanvasNoise(imageData: ImageData) {
    const data = imageData.data;
    const localPrng = mulberry32(originSeed + data.length);

    const pixelCount = data.length / 4;
    const noiseCount = Math.min(200, Math.max(1, Math.floor(pixelCount * 0.00005)));

    for (let i = 0; i < noiseCount; i++) {
      const pixelIndex = Math.floor(localPrng() * pixelCount) * 4;
      const channel = Math.floor(localPrng() * 3);
      const noise = Math.floor(localPrng() * 3) - 1;

      data[pixelIndex + channel] = Math.max(0, Math.min(255, data[pixelIndex + channel] + noise));
    }
    return imageData;
  }

  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
    const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
    return addCanvasNoise(imageData);
  };
  maskFunction(CanvasRenderingContext2D.prototype.getImageData, originalGetImageData);

  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const offscreen = document.createElement('canvas');
    offscreen.width = this.width;
    offscreen.height = this.height;
    const offscreenCtx = offscreen.getContext('2d');

    if (offscreenCtx) {
        offscreenCtx.drawImage(this, 0, 0);
        try {
            const imageData = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
            addCanvasNoise(imageData);
            offscreenCtx.putImageData(imageData, 0, 0);
            return offscreen.toDataURL(type, quality);
        } catch {}
    }
    return originalToDataURL.call(this, type, quality);
  };
  maskFunction(HTMLCanvasElement.prototype.toDataURL, originalToDataURL);

  HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    const offscreen = document.createElement('canvas');
    offscreen.width = this.width;
    offscreen.height = this.height;
    const offscreenCtx = offscreen.getContext('2d');

    if (offscreenCtx) {
        offscreenCtx.drawImage(this, 0, 0);
        try {
            const imageData = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
            addCanvasNoise(imageData);
            offscreenCtx.putImageData(imageData, 0, 0);
            offscreen.toBlob(callback, type, quality);
            return;
        } catch {}
    }
    originalToBlob.call(this, callback, type, quality);
  };
  maskFunction(HTMLCanvasElement.prototype.toBlob, originalToBlob);

  if (typeof OffscreenCanvas !== 'undefined' && originalOffscreenConvertToBlob) {
    OffscreenCanvas.prototype.convertToBlob = function(options) {
      // OffscreenCanvasRenderingContext2D doesn't have drawFocusIfNeeded, but we cast to satisfy TS
      const ctx = this.getContext('2d') as unknown as CanvasRenderingContext2D;
      if (ctx) {
        try {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          addCanvasNoise(imageData);
          ctx.putImageData(imageData, 0, 0);
        } catch {}
      }
      return originalOffscreenConvertToBlob.call(this, options);
    };
    maskFunction(OffscreenCanvas.prototype.convertToBlob, originalOffscreenConvertToBlob);
  }

  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const metrics = originalMeasureText.call(this, text);
    const textSeed = fnv1a(text + this.font);
    const localPrng = mulberry32(originSeed + textSeed);

    const jitter = (localPrng() - 0.5) * 0.02;
    const newWidth = metrics.width + jitter;
    const quantizedWidth = Math.round(newWidth * 2) / 2;

    return {
      ...metrics,
      width: quantizedWidth
    } as TextMetrics;
  };
  maskFunction(CanvasRenderingContext2D.prototype.measureText, originalMeasureText);
}
