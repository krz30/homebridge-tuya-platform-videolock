<!-- generated-by: gsd-doc-writer -->
# Deployment and Rollback / Despliegue y reversión

## English

### Supported deployment model

Build and validate on a workstation. The Homebridge/NAS host only installs a pinned Git artifact and runs it. No repository clone, build cache, backup, private key, or package tarball should remain on the NAS.

### Release checklist

1. Run the checks in [TESTING.md](TESTING.md).
2. Confirm `package.json` version and compiled `dist/` match the source.
3. Inspect the package payload and staged diff.
4. Run the secret audit in [SECURITY.md](../SECURITY.md).
5. Commit and push to `main` only after all checks pass.
6. Install the exact release or commit from Homebridge's normal plugin environment.
7. Restart Homebridge and perform the manual VideoLock acceptance test.

Example dependency pin:

```json
{
  "homebridge-tuya-platform-videolock": "github:krz30/homebridge-tuya-platform-videolock#COMMIT_SHA"
}
```

### Rollback

1. Reinstall or repin the last known-good commit.
2. Restart Homebridge.
3. Confirm the version in the plugin inventory/log and repeat lock, doorbell, preview, and live-video tests.
4. Keep rollback archives only in the designated local backup directory, with checksums; never commit or copy them to the NAS.

### Runtime diagnostics

Temporarily enable plugin debug logging. `Tuya allocated ... source` measures cloud allocation; `Getting the first frames took ... (... in FFmpeg)` measures end-to-end and FFmpeg startup. Redact all diagnostic output before sharing. Disable debug afterward.

There is no automated publish/deploy workflow in this repository. GitHub Actions currently performs build and lint checks only.

## Español

Compila, prueba, empaqueta y guarda backups en la máquina local. El NAS solo instala el commit fijo y ejecuta Homebridge. No dejes clones, tarballs, llaves ni backups en el NAS.

Antes de desplegar: valida pruebas, versión, `dist`, contenido del paquete, diff y secretos; luego sube el commit, instálalo de forma normal y realiza la aceptación manual. Para volver atrás, fija el commit bueno anterior, reinicia y repite las pruebas. Los tiempos del log separan asignación Tuya y primer frame; comparte esos logs únicamente después de redactarlos.
