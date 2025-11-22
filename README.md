# Privacy Shield - Extensión Anti-Fingerprinting

Extensión para navegadores basados en Chromium que reduce el fingerprinting con cambios mínimos. Incluye listas configurables (Blanca/Negra) para control granular por dominio.

## Novedades v2.0 (TypeScript & Modernization)

- **Refactorización completa a TypeScript**: Código más robusto y mantenible.
- **Estructura modular**: `src/inject` separado en módulos lógicos (`canvas.ts`, `audio.ts`, etc.).
- **Mejora en la inyección (Fix DDG)**: Solucionado problema con sitios como DuckDuckGo mediante el uso de `chrome.scripting.executeScript` en el mundo MAIN, evitando bloqueos CSP.
- **Native Code Spoofing**: Implementación avanzada de `Proxy` y `toString()` para ocultar mejor las modificaciones.
- **Build System**: Uso de Webpack para generar el código de producción.

## Instalación (Desarrollo)

1. Clona el repositorio.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Construye la extensión:
   ```bash
   npm run build
   ```
   (O usa `npx webpack`)
4. Abre Chrome/Brave/Edge y ve a `chrome://extensions/`.
5. Activa "Modo de desarrollador".
6. Haz clic en "Cargar extensión sin empaquetar" y selecciona la carpeta **`dist/`**.

## Características de Protección

### Canvas Fingerprinting
- Añade ruido mínimo a las exportaciones de canvas
- Protege `toDataURL()`, `toBlob()` y `getImageData()`
- Preserva funcionalidad visual sin detectar cambios

### WebGL Fingerprinting  
- Oculta información real del GPU/driver
- Bloquea extensión `WEBGL_debug_renderer_info`
- Devuelve valores genéricos consistentes

### User Agent Spoofing
- **Por defecto OFF** para evitar inconsistencias
- Solo afecta JavaScript, no headers HTTP
- Configurable via popup

### Timezone Spoofing
- **Por defecto OFF** para evitar incompatibilidades
- Limitado a `Intl.DateTimeFormat`
- Configurable via popup

### Screen/Resolution Spoofing
- **Por defecto OFF** para mantener compatibilidad
- Falsifica propiedades del objeto `screen` (width, height, availWidth, availHeight, colorDepth, pixelDepth)
- Alinea `devicePixelRatio` a un valor consistente (1)
- Implementación defensiva con fallbacks (prototipo Screen + Proxy + direct assignment)
- Puede afectar diseño responsivo y detección de zoom

### Hardware Concurrency Spoofing
- **Por defecto OFF** para evitar problemas de compatibilidad
- Falsifica `navigator.hardwareConcurrency` a un valor estable (4)
- Evita variaciones detectables que pueden flaggear detectores avanzados
- Valor configurable en futuras versiones

## Gestión de Listas

### Lista Blanca (Confiables)
- Sitios donde se minimiza la protección
- Incluye dominios bancarios/auth pre-configurados
- Ideal para preservar autenticación

### Lista Negra (Forzar Protección)
- Protección aplicada sin excepciones
- **Prevalece** sobre lista blanca
- Para sitios con tracking agresivo

### Patrones Soportados
- **Dominio exacto:** `example.com`
- **Comodín prefijo:** `*.example.com` (incluye subdominios)
- **Sanitización automática:** elimina esquemas, paths, caracteres inválidos

## Estructura del Proyecto

```
├── src/
│   ├── background.ts      # Service Worker
│   ├── content.ts         # Content Script (Injection Logic)
│   ├── inject/            # Main World Scripts (Protections)
│   │   ├── index.ts       # Entry point
│   │   ├── patches/       # Protection modules
│   │   └── utils/         # Utilities (PRNG, Native Mask)
│   ├── popup/             # UI Popup
│   └── options/           # UI Options
├── dist/                  # Build artifact (Load this in browser)
├── manifest.json          # Config source
├── webpack.config.js      # Build config
└── tsconfig.json          # TS config
```

## Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.
