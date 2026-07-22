<!-- generated-by: gsd-doc-writer -->
# AI Agent Guide / Guía para agentes de IA

This file is the operational entry point for Codex, Claude, and any other AI or human maintainer. Read it before changing the repository.

Este archivo es el punto de entrada operativo para Codex, Claude y cualquier otro mantenedor. Léelo antes de modificar el repositorio.

## 1. Start here / Comienza aquí

Read these files in order:

1. `README.md` — public purpose, features, installation, and limitations.
2. `docs/DEVELOPMENT.md` — current handoff state, local workflow, and files to modify.
3. `docs/ARCHITECTURE.md` — Tuya-to-HomeKit and RTSP/FFmpeg data flow.
4. `docs/TESTING.md` — verified automated and manual checks.
5. `SECURITY.md` — data that must never enter Git or public output.
6. `docs/DEPLOYMENT.md` — installation and rollback policy.

For configuration details, read `docs/CONFIGURATION.md`. For upstream device mappings and overrides, read `SUPPORTED_DEVICES.md` and `ADVANCED_OPTIONS.md`.

Lee esos archivos en ese orden. Son las fuentes públicas de verdad; no inventes configuración, hosts, credenciales ni resultados de pruebas.

## 2. Project identity / Identidad del proyecto

- Repository/package: `homebridge-tuya-platform-videolock`.
- Independent MIT fork of `@0x5e/homebridge-tuya-platform`.
- Homebridge platform alias: `TuyaPlatform`.
- Documented package version: `1.7.0-videolock.6`.
- Previous known-good `.4` runtime rollback commit: `a257de9dbb499f65ca918d3cfe0932898ae5bbe0`.
- Documentation baseline commit: `470892b466dc99b9f7e67481131e807fd1ef32fc`.

Do not confuse the package name with the platform alias. The original plugin and this fork must not run together because both register `TuyaPlatform`.

## 3. Current VideoLock behavior / Estado actual

The `videolock` category is selected in `src/accessory/AccessoryFactory.ts` and handled by `src/accessory/VideoLockAccessory.ts`.

Implemented:

- One HomeKit accessory combining `LockMechanism`, a real `Doorbell`, and `CameraController`.
- Doorbell events from Tuya DP codes `doorbell` or `doorbell_call`.
- Tuya RTSP allocation begins in HomeKit `prepareStream`.
- FFmpeg converts cloud RTSP into HomeKit SRTP; `options.cameraMaxFPS` selects 15 or 30 fps, defaulting to 15.
- Snapshots have a 7-second timeout, tuned to fail inside Homebridge's slow-handler watchdog window instead of past it.
- Only simultaneous snapshot requests are deduplicated. Completed snapshots are not cached.
- Timing logs distinguish Tuya allocation from FFmpeg and end-to-end first-frame delay.

Not implemented:

- HomeKit Secure Video recording.
- Two-way audio.
- Motion sensor exposure or motion-triggered image capture.
- Direct LAN video; the source is allocated through Tuya Cloud.

The persistent preview cache and doorbell snapshot prewarming were intentionally removed because they caused stale previews or competing stream work. Do not restore them without a new design, tests, and explicit user approval.

## 4. Non-negotiable operating rules / Reglas obligatorias

1. Build, dependency installation, source modification, packaging, and backups happen on the local development machine.
2. The NAS/Homebridge host is runtime-only: install a pinned package/commit and perform normal plugin tests.
3. Do not leave source clones, tarballs, keys, temporary files, or backups on the NAS.
4. Never commit or print real Tuya credentials, app accounts, device/home/product IDs, signed RTSP URLs, Homebridge configuration/persist data, logs, local IPs/hostnames, SSH keys, or backups.
5. Preserve unrelated user changes. Do not rewrite Git history, force-push, delete backups, or rotate credentials without explicit authorization.
6. Keep public examples fictional and use obvious `REPLACE_WITH_...` placeholders. Homebridge JSON does not expand environment variables automatically.
7. `dist/` is intentionally committed even though `.gitignore` ignores it. A runtime source change must include matching compiled output, staged with `git add -f dist`.

## 5. Change workflow / Flujo de cambios

Before editing:

```bash
git status --short
git log -5 --oneline
```

For runtime changes:

```bash
npm ci
npm run lint
npm run build
npm test -- --runInBand test/Config.test.ts test/TuyaStreamDelegate.test.ts test/FanAccessory.test.ts test/Light.test.ts
npm pack --dry-run --json
git add -f dist
```

The focused command is the known credential-free baseline: 4 suites and 42 tests. `test/custom.test.ts` and `test/home.test.ts` require a private local `~/.homebridge-dev/config.json`; do not claim the full suite passes unless that fixture exists and the run actually succeeds.

After editing:

1. Update affected bilingual documentation in the same change.
2. If runtime/package behavior changed, update the fork version and `CHANGELOG.md` appropriately.
3. Verify relative documentation links and package contents.
4. Inspect `git diff` and `git diff --cached`; run the security checks in `SECURITY.md`, including history scanning.
5. Commit only intended files. Push only when the user explicitly requests publication.
6. Deploy by pinning the new commit; record the previous known-good commit for rollback.

## 6. Primary change locations / Archivos principales

| Concern / Área | Source / Fuente | Tests / Pruebas |
|---|---|---|
| VideoLock services and doorbell DPs | `src/accessory/VideoLockAccessory.ts` | accessory/manual acceptance |
| Category routing | `src/accessory/AccessoryFactory.ts` | discovery/manual acceptance |
| RTSP, snapshots, HomeKit streaming | `src/util/TuyaStreamDelegate.ts` | `test/TuyaStreamDelegate.test.ts` |
| FFmpeg lifecycle and timing | `src/util/FfmpegStreamingProcess.ts` | build plus live-video acceptance |
| Platform configuration | `src/config.ts`, `config.schema.json` | validation and Homebridge UI |
| Tuya HTTP/MQTT | `src/core/` | private integration tests only |

## 7. Definition of done / Definición de terminado

A change is complete only when source and `dist` agree, relevant tests pass, documentation remains bilingual and accurate, the package payload contains required compiled files, no secrets/private infrastructure are detected in the worktree or Git history, rollback is known, and the repository is clean after the requested commit/push.

Un cambio está terminado únicamente cuando código y `dist` coinciden, las pruebas relevantes pasan, la documentación bilingüe está actualizada, el paquete contiene los archivos compilados, no hay datos privados en Git, existe un rollback claro y el repositorio queda limpio después del commit/push solicitado.
