
// src/inject/patches/webgl.ts
import { maskFunction } from '../utils/native-mask';

export function patchWebGL() {
  if ((window as any).__psWebGLPatched__) return;
  (window as any).__psWebGLPatched__ = true;

  const spoofedVendor = 'Google Inc. (Intel)';
  const spoofedRenderer = 'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';

  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  let originalGetParameter2: any, originalGetExtension2: any;
  if (typeof WebGL2RenderingContext !== 'undefined') {
    originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    originalGetExtension2 = WebGL2RenderingContext.prototype.getExtension;
  }

  let originalOffscreenGetContext: any;
  if (typeof OffscreenCanvas !== 'undefined') {
    originalOffscreenGetContext = OffscreenCanvas.prototype.getContext;
  }

  function patchedGetParameter(this: WebGLRenderingContext | WebGL2RenderingContext, parameter: number) {
    const result = originalGetParameter.call(this, parameter);

    const ext = this.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      if (parameter === ext.UNMASKED_VENDOR_WEBGL) {
        return spoofedVendor;
      }
      if (parameter === ext.UNMASKED_RENDERER_WEBGL) {
        return spoofedRenderer;
      }
    }

    if (parameter === 0x1F00) return spoofedVendor; // VENDOR
    if (parameter === 0x1F01) return spoofedRenderer; // RENDERER

    return result;
  }

  function patchedGetExtension(this: WebGLRenderingContext | WebGL2RenderingContext, name: string) {
    if (name === 'WEBGL_debug_renderer_info') {
      return null;
    }
    return originalGetExtension.call(this, name);
  }

  // Use 'as any' to bypass strict signature mismatch
  WebGLRenderingContext.prototype.getParameter = patchedGetParameter as any;
  maskFunction(WebGLRenderingContext.prototype.getParameter, originalGetParameter);

  WebGLRenderingContext.prototype.getExtension = patchedGetExtension as any;
  maskFunction(WebGLRenderingContext.prototype.getExtension, originalGetExtension);

  if (typeof WebGL2RenderingContext !== 'undefined') {
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      // Need to cast 'this'
      const ctx = this as unknown as WebGLRenderingContext;
      const result = originalGetParameter2.call(ctx, parameter);
      return patchedGetParameter.call(ctx, parameter) || result;
    } as any;
    maskFunction(WebGL2RenderingContext.prototype.getParameter, originalGetParameter2);

    WebGL2RenderingContext.prototype.getExtension = patchedGetExtension as any;
    maskFunction(WebGL2RenderingContext.prototype.getExtension, originalGetExtension2);
  }

  function patchedGetContext(this: HTMLCanvasElement, contextType: string, contextAttributes?: any) {
    const context = originalGetContext.call(this, contextType, contextAttributes);

    if (context && (contextType.includes('webgl') || contextType === 'experimental-webgl')) {
      if ((context as any).getParameter && !(context as any).__psWebGLPatched__) {
        (context as any).getParameter = patchedGetParameter.bind(context as any);
        (context as any).getExtension = patchedGetExtension.bind(context as any);
        maskFunction((context as any).getParameter, originalGetParameter);
        maskFunction((context as any).getExtension, originalGetExtension);
        (context as any).__psWebGLPatched__ = true;
      }
    }

    return context;
  }

  HTMLCanvasElement.prototype.getContext = patchedGetContext as any;
  maskFunction(HTMLCanvasElement.prototype.getContext, originalGetContext);

  if (typeof OffscreenCanvas !== 'undefined') {
    OffscreenCanvas.prototype.getContext = function(contextType: any, contextAttributes?: any) {
      const context = originalOffscreenGetContext.call(this, contextType, contextAttributes);

      if (context && (contextType.includes('webgl') || contextType === 'experimental-webgl')) {
        if ((context as any).getParameter && !(context as any).__psWebGLPatched__) {
          (context as any).getParameter = patchedGetParameter.bind(context as any);
          (context as any).getExtension = patchedGetExtension.bind(context as any);
          maskFunction((context as any).getParameter, originalGetParameter);
          maskFunction((context as any).getExtension, originalGetExtension);
          (context as any).__psWebGLPatched__ = true;
        }
      }

      return context;
    } as any;
    maskFunction(OffscreenCanvas.prototype.getContext, originalOffscreenGetContext);
  }
}
