<!-- generated-by: gsd-doc-writer -->
# Getting Started / Primeros pasos

## English

### Prerequisites

- Homebridge `^1.6.0` or `^2.0.0`.
- Node.js `^22.12.0` or `^24.0.0`.
- A Tuya Cloud project linked to the same Tuya Smart or Smart Life account as the device.
- Internet connectivity from Homebridge and FFmpeg supplied through `@homebridge/camera-utils`.

### Install for use

```bash
npm install github:krz30/homebridge-tuya-platform-videolock#<release-or-commit>
```

Remove the original `homebridge-tuya-platform` first. Configure with the Homebridge UI, restart Homebridge, ring the doorbell, then open the camera and lock controls.

### Clone for development

```bash
git clone https://github.com/krz30/homebridge-tuya-platform-videolock.git
cd homebridge-tuya-platform-videolock
npm ci
npm run lint
npm run build
```

### Common setup issues

- **Duplicate platform or accessories:** only one plugin registering `TuyaPlatform` may be installed.
- **Login errors:** verify data center, app account, country code, schema, linked account, and authorized Tuya services.
- **Doorbell works but video is slow:** enable debug temporarily and compare `Tuya allocated...` with `Getting the first frames took...`; the second figure includes camera/RTSP/FFmpeg delay.
- **Stale tile after migration:** this fork intentionally has no persistent snapshot cache; restart Homebridge and confirm the installed commit/version.

Next: [Configuration](CONFIGURATION.md), [Development](DEVELOPMENT.md), and [Testing](TESTING.md).

## Español

Necesitas Homebridge y Node en las versiones anteriores, un proyecto Tuya enlazado a la cuenta de la app, internet y FFmpeg. Desinstala el plugin original, instala este fork fijando versión o commit, configura Homebridge localmente y reinicia. Prueba timbre, cámara y cerradura.

Si hay accesorios duplicados, quedaron dos plugins con `TuyaPlatform`. Si falla el login, revisa región, cuenta vinculada y APIs. Si el timbre notifica pero el video tarda, compara los tiempos Tuya y primer frame en el log: la mayor espera suele ocurrir después de reservar el RTSP.
