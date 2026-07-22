<!-- generated-by: gsd-doc-writer -->
# Contributing / Contribuir

## English

Read [Getting Started](docs/GETTING-STARTED.md), [Development](docs/DEVELOPMENT.md), and [Testing](docs/TESTING.md) before changing the plugin.

- Create a focused branch and keep unrelated formatting out of the change.
- Follow the existing TypeScript/ESLint style and run `npm run lint`.
- Add or update tests, run the focused safe suite, and build `dist/`.
- Commit matching source and compiled output because Git installs use `dist/`.
- Describe behavior, test evidence, compatibility impact, and rollback in the PR.
- Never attach real Tuya configs, device inventories, private logs, signed stream URLs, keys, or backups.

Report bugs through [GitHub Issues](https://github.com/krz30/homebridge-tuya-platform-videolock/issues) with steps, expected/actual behavior, Homebridge/Node/plugin versions, and redacted logs. Use the repository issue templates when available.

## Español

Lee las guías enlazadas antes de modificar. Crea una rama enfocada, respeta TypeScript/ESLint, añade pruebas, compila y confirma juntos `src` y `dist`. El PR debe explicar comportamiento, pruebas, compatibilidad y reversión.

Para reportar un problema incluye pasos, resultado esperado/real, versiones y logs redactados. Nunca adjuntes configuración Tuya real, inventarios, IDs, URLs firmadas, credenciales, llaves ni backups.
