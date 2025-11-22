
// src/inject/utils/native-mask.ts

export const nativeToString = Function.prototype.toString;

export function maskFunction(patched: any, original: any) {
  if (!original || !patched) return;
  try {
    Object.defineProperty(patched, 'name', { value: original.name, configurable: true });
    Object.defineProperty(patched, 'length', { value: original.length, configurable: true });
    patched.toString = nativeToString.bind(original);
  } catch {}
}
