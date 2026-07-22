<!-- generated-by: gsd-doc-writer -->
# Configuration / Configuración

## English

The plugin reads Homebridge platform configuration, not environment variables. Keep the real `config.json` only on the Homebridge host and never commit it.

### Required Tuya Cloud services

Authorize at least Authorization Token Management, Device Status Notification, IoT Core, IoT Video Live Stream, and Smart Lock Open Service. Other upstream device types may require the additional services described in the upstream documentation.

### Smart Home project (`projectType: "2"`)

| Setting | Required | Default | Purpose |
|---|---:|---|---|
| `platform` | yes | — | Must be `TuyaPlatform`. |
| `options.projectType` | yes | `"2"` in UI | Selects Smart Home login. |
| `options.accessId` | yes | — | Tuya Cloud Access ID. |
| `options.accessKey` | yes | — | Tuya Cloud Access Secret. |
| `options.countryCode` | yes | — | Numeric app-account country code. |
| `options.username` | yes | — | Tuya Smart/Smart Life app account. |
| `options.password` | yes | — | App password or supported 32-character MD5 digest. |
| `options.appSchema` | yes | `tuyaSmart` | `tuyaSmart` or `smartlife`. |
| `options.endpoint` | no | inferred | Override only when regional login needs it. |
| `options.homeWhitelist` | no | all homes | Limits discovery to selected home IDs. |
| `options.deviceOverrides` | no | none | Category, bridging, or DP schema overrides. |
| `options.debug` | no | `false` | Enables diagnostic logs. |
| `options.debugLevel` | no | all debug scopes | Comma-separated `api` and/or device IDs. |

### Custom project (`projectType: "1"`)

Requires `endpoint`, `accessId`, and `accessKey`. It discovers assets through the Custom project flow. See [ADVANCED_OPTIONS.md](../ADVANCED_OPTIONS.md) for device/schema overrides.

### Safe example

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
    "debug": false
  }
}
```

Do not post debug logs without redacting IDs, usernames, URLs, tokens, `local_key`, location fields, and the generated `TuyaDeviceList.*.json`.

## Español

El plugin usa la configuración de plataforma de Homebridge, no variables de entorno. El `config.json` real debe quedarse únicamente en el host y nunca subirse a Git.

Para Smart Home son obligatorios `accessId`, `accessKey`, `countryCode`, `username`, `password` y `appSchema`; `endpoint`, filtros, overrides y debug son opcionales. Para un proyecto Custom son obligatorios `endpoint`, `accessId` y `accessKey`. Autoriza Token Management, Device Status Notification, IoT Core, IoT Video Live Stream y Smart Lock Open Service.

Los valores del ejemplo son marcadores literales: JSON de Homebridge no sustituye variables automáticamente. Antes de compartir logs, elimina credenciales, IDs, URLs firmadas, datos de ubicación y archivos de inventario Tuya.
