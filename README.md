<!-- generated-by: gsd-doc-writer -->
# Homebridge Tuya Platform VideoLock

Independent Homebridge plugin fork that adds Tuya `videolock` devices as one HomeKit accessory with a lock, doorbell, snapshots, and live camera streaming.

[English](#english) · [Español](#español) · [Architecture / Arquitectura](docs/ARCHITECTURE.md) · [Security / Seguridad](SECURITY.md)

AI maintainers: start with [`AGENTS.md`](AGENTS.md). Claude also discovers [`CLAUDE.md`](CLAUDE.md).

> This is an independent fork of [@0x5e/homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform). It uses a different package name and is not an official Tuya or upstream release.

## English

### What this fork adds

- A `VideoLockAccessory` for Tuya category `videolock`.
- `LockMechanism`, door contact sensor, `Doorbell`, and `CameraController` on the same HomeKit accessory.
- Door-open and door-close notifications through the contact sensor, preferring `open_close` or `closed_opened` and falling back to `lock_motor_state`.
- Opening-event notifications from `door_opened`, `open_inside`, or Tuya unlock records, exposed as a short HomeKit motion event even when the lock was already unlocked.
- Doorbell notifications from Tuya `doorbell` or `doorbell_call` data points.
- Tuya RTSP allocation during HomeKit's prepare handshake to reduce startup delay.
- Live H.264 video transcoded by FFmpeg to HomeKit SRTP with a selectable 15 or 30 fps profile (15 by default).
- Fresh snapshots with a 15-second timeout sized for the measured VideoLock wake-up delay; only concurrent requests share work. There is no persistent snapshot cache, so previews do not intentionally reuse an old frame.
- Timing logs that separate Tuya allocation from FFmpeg/first-frame delay.

### Important limitations

- Video is not LAN-direct: Tuya Cloud allocates the RTSP source, so internet access, camera wake-up time, and Tuya latency affect startup.
- HomeKit Secure Video recording and two-way audio are not enabled.
- The door-opening motion event does not trigger image capture; it exists only to expose `door_opened`/`open_inside` notifications.
- Never run this fork beside `homebridge-tuya-platform`; both register the `TuyaPlatform` alias.

### Installation

Pin a release or commit so production cannot change unexpectedly:

```bash
npm install github:krz30/homebridge-tuya-platform-videolock#<release-or-commit>
```

Example pinned to the previous known-good build (`1.7.0-videolock.7`, commit `811335a`):

```bash
npm install github:krz30/homebridge-tuya-platform-videolock#811335a
```

The development build is version `1.7.0-videolock.12`. Pin its Git commit after publication and installation so production cannot move unexpectedly.

### Quick start

1. Create a Tuya Cloud project and authorize the APIs listed in [Configuration](docs/CONFIGURATION.md).
2. Install this fork and remove the original plugin if present.
3. Configure the platform through Homebridge UI or a local `config.json`; never commit that file.
4. Restart Homebridge and verify that the VideoLock exposes lock, doorbell, microphone, and camera services.

A sanitized Smart Home example:

```json
{
  "platform": "TuyaPlatform",
  "name": "Tuya",
  "options": {
    "projectType": "2",
    "accessId": "REPLACE_WITH_TUYA_ACCESS_ID",
    "accessKey": "REPLACE_WITH_TUYA_ACCESS_SECRET",
    "countryCode": 1,
    "username": "REPLACE_WITH_APP_ACCOUNT",
    "password": "REPLACE_WITH_APP_PASSWORD",
    "appSchema": "smartlife",
    "cameraMaxFPS": 15,
    "debug": false
  }
}
```

These placeholders are literal; Homebridge JSON does not expand environment variables automatically.

### Documentation

- [Getting started](docs/GETTING-STARTED.md)
- [Configuration](docs/CONFIGURATION.md)
- [Architecture and video flow](docs/ARCHITECTURE.md)
- [Development and project handoff](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Deployment and rollback](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [AI handoff / Guía para agentes](AGENTS.md)
- [Supported upstream device categories](SUPPORTED_DEVICES.md)
- [Advanced device overrides](ADVANCED_OPTIONS.md)
- [Changelog](CHANGELOG.md)

## Español

### Qué agrega este fork

- Un `VideoLockAccessory` para la categoría Tuya `videolock`.
- `LockMechanism`, sensor de contacto de puerta, `Doorbell` y `CameraController` en un solo accesorio de HomeKit.
- Notificaciones al abrir y cerrar mediante el sensor de contacto, usando primero `open_close` o `closed_opened` y recurriendo a `lock_motor_state` cuando no existen.
- Notificaciones mediante un pulso corto de movimiento desde `door_opened`, `open_inside` o los registros de desbloqueo Tuya, incluso si la puerta ya estaba sin candado.
- Notificaciones del timbre mediante los data points `doorbell` o `doorbell_call`.
- Reserva del RTSP de Tuya durante la preparación de HomeKit para reducir la espera inicial.
- Video H.264 convertido por FFmpeg a SRTP de HomeKit, seleccionable entre 15 o 30 fps (15 por defecto).
- Capturas nuevas con límite de 15 segundos, dimensionado según la demora medida al despertar el VideoLock; solo las solicitudes simultáneas comparten trabajo. No existe caché persistente de previews.
- Logs de tiempo separados para Tuya, FFmpeg y el primer frame.

### Limitaciones importantes

- El video no es directo por LAN: Tuya Cloud entrega el RTSP. Internet, el despertar de la cámara y la latencia de Tuya influyen en la carga.
- No están habilitados HomeKit Secure Video ni el audio bidireccional.
- El evento de movimiento de apertura no toma imágenes; solo expone notificaciones de `door_opened`/`open_inside`.
- No debe ejecutarse junto con `homebridge-tuya-platform`; ambos usan el alias `TuyaPlatform`.

### Instalación y primer uso

Instala una versión o commit fijo:

```bash
npm install github:krz30/homebridge-tuya-platform-videolock#<version-o-commit>
```

Ejemplo fijado a la compilación buena anterior (`1.7.0-videolock.7`, commit `811335a`):

```bash
npm install github:krz30/homebridge-tuya-platform-videolock#811335a
```

La compilación en desarrollo corresponde a `1.7.0-videolock.12`. Después de publicarla e instalarla, fija su commit de Git para evitar cambios inesperados. Crea el proyecto Tuya, autoriza las APIs, instala solo este fork, configura Homebridge localmente y reinicia. Consulta [Configuración](docs/CONFIGURATION.md) para los detalles.

## License / Licencia

MIT. See [LICENSE](LICENSE). Original upstream work remains attributed to its authors.
