# Documentation · Documentación

Both languages cover the same material and use the same filenames, so any page has a direct
counterpart in the other locale.

Los dos idiomas cubren el mismo material y usan los mismos nombres de archivo, así que cualquier
página tiene su equivalente directo en el otro idioma.

| # | English (`en/`) | Español (`es/`) |
|---|---|---|
| 1 | [Project setup](en/01-project-setup.md) | [Configuración del proyecto](es/01-project-setup.md) |
| 2 | [Selectors](en/02-selectors.md) | [Selectores](es/02-selectors.md) |
| 3 | [Testing behind auth](en/03-testing-behind-auth.md) | [Probar detrás de la autenticación](es/03-testing-behind-auth.md) |
| 4 | [State and test isolation](en/04-state-and-isolation.md) | [Estado y aislamiento de pruebas](es/04-state-and-isolation.md) |
| 5 | [Network control](en/05-network-control.md) | [Control de la red](es/05-network-control.md) |
| 6 | [Component tests vs E2E](en/06-component-vs-e2e.md) | [Pruebas de componente frente a E2E](es/06-component-vs-e2e.md) |
| 7 | [Secrets and environment variables](en/07-secrets-and-env.md) | [Secretos y variables de entorno](es/07-secrets-and-env.md) |
| 8 | [Accessibility](en/08-accessibility.md) | [Accesibilidad](es/08-accessibility.md) |
| 9 | [CI](en/09-ci.md) | [CI](es/09-ci.md) |
| 10 | [Anti-patterns](en/10-anti-patterns.md) | [Antipatrones](es/10-anti-patterns.md) |
| 11 | [The Makefile as the entrypoint](en/11-makefile-as-entrypoint.md) | [El Makefile como punto de entrada](es/11-makefile-as-entrypoint.md) |

## Conventions · Convenciones

Code, file paths, identifiers, `data-cy` values and Cypress API names are left in English in both
locales, because they are what you actually type. Only the prose is translated.

El código, las rutas de archivo, los identificadores, los valores `data-cy` y los nombres de la API de
Cypress se dejan en inglés en los dos idiomas, porque son lo que de verdad se escribe. Solo se traduce
la prosa.

If you edit one locale, edit the other. `en/` is the source of truth when they disagree.

Si editas un idioma, edita el otro. `en/` es la fuente de verdad cuando no coinciden.

## Running this site · Ejecutar este sitio

These pages are plain Markdown, so they read fine on GitHub. They are also published with VitePress:

Estas páginas son Markdown puro, así que se leen bien en GitHub. También se publican con VitePress:

```bash
make docs           # dev server on :5175, hot reload
make docs-build     # static output in docs/.vitepress/dist
make docs-preview   # serve the built output
```

Adding a chapter means three edits: the file in `en/`, the file in `es/`, and the `CHAPTERS` array in
[`.vitepress/config.ts`](.vitepress/config.ts), which drives both sidebars from one list.

Añadir un capítulo son tres cambios: el archivo en `en/`, el archivo en `es/`, y el array `CHAPTERS` en
[`.vitepress/config.ts`](.vitepress/config.ts), que genera las dos barras laterales desde una sola lista.
