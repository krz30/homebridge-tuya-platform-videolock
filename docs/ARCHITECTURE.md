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
                                  ├─ ContactSensor (physical state, optional)
                                  ├─ ContactSensor (door-open event)
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

### Lock state, physical state, and opening events

These signals are not interchangeable:

- `lock_motor_state` belongs to `LockMechanism`; it reports locked/unlocked and must not be duplicated as a Contact Sensor.
- `open_close` or `closed_opened`, when present, represent a distinct physical door state and may create an optional state Contact Sensor.
- `open_inside` can remain latched at `true`, so it cannot represent repeated openings by itself.
- Unlock records such as `unlock_fingerprint` and `unlock_face` arrive on every successful operation even when their numeric value repeats. Together with `door_opened`/`open_inside`, they drive the dedicated `Door Opened` event contact.
- The event contact uses HAP `sendEventNotification` and resets after 30 seconds. Cached legacy state contacts and motion-event services must be removed during service migration.

For the current device, which lacks `open_close`/`closed_opened`, the intentional Home layout is one Lock plus one `Door Opened` Contact Sensor. Do not add a third service that mirrors the Lock.

### Key abstractions

| Component | Responsibility |
|---|---|
| `src/index.ts` | Registers the `TuyaPlatform` dynamic platform. |
| `src/platform.ts` | Validates configuration, discovers devices, manages cached accessories and events. |
| `src/core/TuyaOpenAPI.ts` | Signs and sends Tuya Cloud API requests. |
| `src/core/TuyaOpenMQ.ts` | Receives Tuya device status events through MQTT. |
| `src/accessory/AccessoryFactory.ts` | Selects the handler for each Tuya category. |
| `src/accessory/VideoLockAccessory.ts` | Combines lock, door contact, doorbell, and camera behavior for `videolock`. |
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

La plataforma dinámica descubre dispositivos mediante Tuya Cloud, elige un handler por categoría y traduce estados y comandos a servicios HomeKit. En `videolock`, un solo handler agrupa cerradura, sensor de contacto de puerta, timbre real y cámara.

### Flujo de video

HomeKit prepara la sesión, el plugin reserva puertos y solicita el RTSP a Tuya anticipadamente. Al iniciar, FFmpeg lee ese RTSP de nube, convierte H.264 y envía SRTP cifrado al controlador HomeKit. Para previews se solicita un frame nuevo; solo las peticiones simultáneas se deduplican. La espera puede venir del despertar de la cámara o del primer frame de Tuya, además de la carga de FFmpeg en el NAS.

### Estado del candado frente a eventos de apertura

`lock_motor_state` pertenece exclusivamente a la cerradura y no debe duplicarse como contacto. Solo `open_close`/`closed_opened` justifican un contacto físico adicional. Como `open_inside` puede quedarse fijado en `true`, las aperturas repetidas se detectan también mediante registros como `unlock_fingerprint` y `unlock_face`. El contacto dedicado `Door Opened` fuerza el evento HAP, se restablece después de 30 segundos y reemplaza automáticamente servicios antiguos guardados en caché. En el dispositivo actual, el diseño intencional es una cerradura y un solo contacto de apertura.

Las responsabilidades y rutas exactas aparecen en las tablas de la sección inglesa y son la referencia para retomar cambios.
