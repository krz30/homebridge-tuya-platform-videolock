<!-- generated-by: gsd-doc-writer -->
# Testing / Pruebas

## English

The project uses Jest 29 with `ts-jest`. Install dependencies with `npm ci` before testing.

### Required pre-push checks

```bash
npm run lint
npm run build
npm test -- --runInBand test/Config.test.ts test/TuyaStreamDelegate.test.ts test/VideoLockAccessory.test.ts test/FanAccessory.test.ts test/Light.test.ts
npm pack --dry-run --json
```

The focused command currently covers 46 tests across five suites and does not require a live Homebridge development profile. `test/custom.test.ts` and `test/home.test.ts` are integration-style suites that expect `~/.homebridge-dev/config.json`; do not claim a clean full suite unless that local fixture exists and the run succeeds.

### Writing tests

Tests live in `test/` and follow `*.test.ts`. `test/Config.test.ts` verifies accepted camera frame-rate values. Camera timing and cloud calls should be mocked; never put a real device ID, signed RTSP URL, account, password, or Tuya key in a fixture. For snapshot behavior, test both concurrent deduplication and a new request after the previous promise settles.

### Coverage and CI

No minimum coverage threshold is configured. `.github/workflows/build.yml` runs on pushes and pull requests with Node 22 and 24, then executes `npm ci`, lint, and build. It does not currently run Jest.

### Manual VideoLock acceptance

1. Confirm one HomeKit accessory exposes lock, contact sensor, doorbell, microphone, and camera-management services.
2. Open and close the locked door and verify the contact state and both configured Home notifications.
3. Leave the door unlocked, open it with the handle, and verify the door-open motion event and Home notification.
4. Ring the physical doorbell and verify the Home notification.
5. Open live video twice and check startup timing/log errors.
6. Request a preview after lighting changes and confirm it is fresh.
7. Lock/unlock and verify current and target states.

## Español

Jest 29 con `ts-jest` ejecuta las pruebas. Antes de subir, corre lint, build, las cinco suites enfocadas y revisa el paquete. Las suites `custom` y `home` requieren un `config.json` de desarrollo local; no deben contarse como aprobadas si ese fixture no existe.

No hay umbral de cobertura. CI valida Node 22/24, instalación, lint y build, pero todavía no ejecuta Jest. Las pruebas y fixtures nunca deben contener IDs, cuentas, claves ni RTSP reales. La aceptación manual debe verificar el sensor y las notificaciones al abrir/cerrar, los servicios, la notificación del timbre, el video, el preview actualizado y los estados de cerradura.
