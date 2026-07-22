<!-- generated-by: gsd-doc-writer -->
# Development and Handoff / Desarrollo y continuidad

AI or human maintainers should begin with [`AGENTS.md`](../AGENTS.md); Claude-specific discovery is provided by [`CLAUDE.md`](../CLAUDE.md).

## English

### Current project state

- Documented release: `1.7.0-videolock.6`.
- Previous known-good `.4` rollback commit: `a257de9dbb499f65ca918d3cfe0932898ae5bbe0`.
- `videolock` routes to `VideoLockAccessory` in `AccessoryFactory`.
- Doorbell notifications, lock services, current snapshots, and live video are implemented.
- RTSP allocation begins during `prepareStream`; profiles use the configured 15 or 30 fps maximum, with 15 as the default.
- Snapshot timeout is 7 seconds, and FFmpeg is tuned (`-rtsp_transport tcp -analyzeduration 0 -probesize 32000 -fflags nobuffer+discardcorrupt`) to reach the first frame faster and reduce Homebridge's slow-handler warning. Only concurrent snapshots are shared; persistent caching and doorbell prewarming were removed to avoid stale previews and competing RTSP work.
- Motion-triggered capture, motion service, HKSV recording, and two-way audio are not implemented.

### Local-only build policy

Fork, install dependencies, modify, build, test, package, and retain backups on the development machine. The NAS/Homebridge host is a runtime target only: install the pinned Git package and test it like any other Homebridge plugin. Do not leave source trees, tarballs, keys, or backups scattered on the NAS.

### Setup and commands

```bash
git clone https://github.com/krz30/homebridge-tuya-platform-videolock.git
cd homebridge-tuya-platform-videolock
npm ci
```

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint over TypeScript sources, zero warnings allowed. |
| `npm run build` | Recreate `dist/` with TypeScript. |
| `npm test` | Run all Jest suites; two suites need a local Homebridge development config. |
| `npm run watch` | Build, link, and restart through nodemon. |
| `npm run launch` | Compile and launch an insecure debug Homebridge instance. |
| `npm pack --dry-run --json` | Inspect the package payload without publishing. |

`dist/` is normally ignored but intentionally committed in this fork because Homebridge Git installation needs precompiled JavaScript. After building, stage it explicitly with `git add -f dist`.

### Safe change workflow

1. Branch from `main`; use a descriptive name such as `fix/video-startup`.
2. Make the smallest source change and add focused tests.
3. Run lint, build, targeted tests, and package inspection.
4. Review `git diff --cached`, then scan tracked files and full history for secrets.
5. Bump the fork suffix/version when deploying a new artifact.
6. Commit source and matching `dist/` together; push no local config, logs, device lists, keys, backups, or RTSP URLs.
7. Install a pinned commit on Homebridge, test, and roll back by restoring the previous commit pin.

### Where to change VideoLock behavior

- Services and doorbell DP handling: `src/accessory/VideoLockAccessory.ts`.
- Category selection: `src/accessory/AccessoryFactory.ts`.
- Stream/snapshot lifecycle: `src/util/TuyaStreamDelegate.ts`.
- FFmpeg readiness and timings: `src/util/FfmpegStreamingProcess.ts`.
- Focused tests: `test/TuyaStreamDelegate.test.ts`.

## Español

### Estado y cómo retomarlo

El estado documentado es `.6`. Funciona cerradura + timbre + cámara, la reserva RTSP se adelanta a `prepareStream`, se puede seleccionar 15 o 30 fps y no se conserva caché de previews. No existen todavía sensor/captura por movimiento, HKSV ni audio bidireccional.

Todo el desarrollo, compilación, empaquetado y backup debe hacerse localmente. En el NAS solo se instala el commit preparado y se realizan pruebas normales. Para continuar, modifica las rutas indicadas, añade tests, ejecuta lint/build/pruebas, fuerza el staging de `dist`, inspecciona seguridad y despliega un commit fijo. Nunca subas configuración, credenciales, inventarios de dispositivos, logs privados ni backups.
