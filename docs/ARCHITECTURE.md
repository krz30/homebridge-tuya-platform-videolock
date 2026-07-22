<!-- generated-by: gsd-doc-writer -->
# Architecture / Arquitectura

## English

### System overview

This dynamic Homebridge platform discovers devices through Tuya Cloud, maps each category to an accessory handler, and translates Tuya status/commands into HomeKit services. For `videolock`, one handler combines the lock, real doorbell, and camera controller because HomeKit expects the Doorbell service to live on the camera accessory.

```text
Tuya app/device
      │ status + commands
      ▼
Tuya Cloud API/MQTT ──► TuyaPlatform ──► AccessoryFactory
                                            │
                                            ▼
                                  VideoLockAccessory
                                  ├─ LockMechanism
                                  ├─ Doorbell
                                  └─ CameraController
                                            │
                         cloud RTSP ──► FFmpeg ──► SRTP ──► HomeKit
```

### Video and snapshot flow

1. HomeKit calls `prepareStream`; the delegate reserves ports and immediately starts Tuya RTSP allocation.
2. During `START`, the same allocation promise is awaited instead of starting allocation late.
3. FFmpeg reads the cloud RTSP input, transcodes H.264 with the ultrafast/zero-latency settings, and sends encrypted SRTP to the HomeKit controller.
4. First-frame timing is logged from preparation and separately inside FFmpeg.
5. A preview requests a new RTSP allocation and one JPEG frame. Simultaneous preview requests reuse the same in-flight promise, but the completed frame is not cached.

The Tuya allocation request can be quick while the RTSP source still takes several seconds to emit its first frame. NAS CPU load can add delay during transcoding, but it is not the only source of latency.

### Key abstractions

| Component | Responsibility |
|---|---|
| `src/index.ts` | Registers the `TuyaPlatform` dynamic platform. |
| `src/platform.ts` | Validates configuration, discovers devices, manages cached accessories and events. |
| `src/core/TuyaOpenAPI.ts` | Signs and sends Tuya Cloud API requests. |
| `src/core/TuyaOpenMQ.ts` | Receives Tuya device status events through MQTT. |
| `src/accessory/AccessoryFactory.ts` | Selects the handler for each Tuya category. |
| `src/accessory/VideoLockAccessory.ts` | Combines lock, doorbell, and camera behavior for `videolock`. |
| `src/util/TuyaStreamDelegate.ts` | Handles HomeKit stream preparation, RTSP allocation, snapshots, and FFmpeg arguments. |
| `src/util/FfmpegStreamingProcess.ts` | Owns the FFmpeg process, first-frame telemetry, and shutdown behavior. |

### Directory structure

```text
src/accessory/       device-to-HomeKit handlers
src/core/            Tuya HTTP and MQTT clients
src/device/          Tuya models and discovery managers
src/util/            camera, FFmpeg, logging, and helpers
test/                Jest unit and integration-style tests
dist/                compiled JavaScript shipped for Git installation
docs/                public project documentation
```

## Español

### Resumen del sistema

La plataforma dinámica descubre dispositivos mediante Tuya Cloud, elige un handler por categoría y traduce estados y comandos a servicios HomeKit. En `videolock`, un solo handler agrupa cerradura, timbre real y cámara.

### Flujo de video

HomeKit prepara la sesión, el plugin reserva puertos y solicita el RTSP a Tuya anticipadamente. Al iniciar, FFmpeg lee ese RTSP de nube, convierte H.264 y envía SRTP cifrado al controlador HomeKit. Para previews se solicita un frame nuevo; solo las peticiones simultáneas se deduplican. La espera puede venir del despertar de la cámara o del primer frame de Tuya, además de la carga de FFmpeg en el NAS.

Las responsabilidades y rutas exactas aparecen en las tablas de la sección inglesa y son la referencia para retomar cambios.
