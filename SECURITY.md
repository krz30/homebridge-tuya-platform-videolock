<!-- generated-by: gsd-doc-writer -->
# Security / Seguridad

## English

### Reporting a vulnerability

Do not open a public issue containing credentials, device identifiers, private network details, or an exploitable vulnerability. Contact the repository owner privately through GitHub first; public disclosure can follow after credentials are rotated and a fix is available.

### Never commit

- Tuya Access ID/Secret, app username/password, tokens, cookies, or signed RTSP URLs.
- Homebridge `config.json`, auth/persist data, `TuyaDeviceList.*.json`, logs, or debug captures.
- SSH/deploy keys, `.env*`, certificates, local IPs/hostnames, backups, or package archives.

The repository ignores common forms of these files, but ignore rules are not a security boundary. Inspect every staged diff.

### Before every push

```bash
git status --short
git diff --cached --check
git diff --cached --name-only
git grep -Il -E '-----BEGIN ([A-Z ]+ )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}'
```

Use a maintained secret scanner such as Gitleaks when available, including its full-history mode. Pattern scans can miss unknown formats, so also review configuration examples and Git history manually.

If a secret was ever pushed, deleting the current file is insufficient: rotate/revoke it immediately, then coordinate a history rewrite and force-push. Treat the old value as compromised.

### Runtime caution

Debug mode can include Tuya request metadata and device details. Enable it only briefly, protect Homebridge storage permissions, redact logs before sharing, and disable it after diagnosis.

## Español

### Reporte y reglas

No abras un issue público con credenciales, identificadores, red privada ni detalles explotables. Contacta primero al dueño del repositorio por un canal privado de GitHub.

Nunca confirmes claves Tuya, cuenta/contraseña, tokens, RTSP firmados, `config.json`, persistencia de Homebridge, inventarios, logs, llaves SSH, certificados, `.env`, IP/hostname local, backups ni paquetes. Los ignores ayudan, pero siempre revisa el diff staged y todo el historial con un escáner.

Si una clave llegó a Git, revócala o rótala de inmediato. Borrarla en el commit actual no la elimina del historial; una reescritura debe coordinarse después. El modo debug debe usarse brevemente y los logs deben redactarse antes de compartirlos.
