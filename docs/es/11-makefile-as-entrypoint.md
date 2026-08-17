# 11. El Makefile como punto de entrada

*[English](../en/11-makefile-as-entrypoint.md) · [Español](../es/11-makefile-as-entrypoint.md)*

- Una sola superficie de comandos descubrible: `make help`. Sin conocimiento tribal sobre qué script de npm ejecutar.
- CI ejecuta los mismos targets que tú, así que el "en mi máquina funciona" no tiene dónde esconderse.
- El Makefile delega en los scripts de npm. Nunca los reimplementa.

## Ayuda autodocumentada

```makefile
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
```

Cada target lleva un comentario `##` y aparece automáticamente. Un `make` a secas imprime la ayuda en
lugar de hacer algo. El primer comando de quien acaba de llegar es evidente e inofensivo.

Fíjate en el `0-9` de esa clase de caracteres. Sin él, `e2e` y `a11y` desaparecen en silencio de la
ayuda, que es un ejemplo bastante representativo del tipo de error que invita este patrón.

## Variables donde de verdad hacen falta

```bash
make e2e CYPRESS_SPEC=cypress/e2e/todos/crud.cy.ts
make e2e BROWSER=chrome
make component CYPRESS_SPEC=cypress/component/LoginForm.cy.tsx
```

```makefile
CYPRESS_SPEC ?=
BROWSER ?= electron
SPEC_FLAG := $(if $(CYPRESS_SPEC),--spec "$(CYPRESS_SPEC)",)
```

El ciclo de una sola spec es el que usas cincuenta veces al día mientras escribes una prueba.
Convertirlo en una variable en lugar de un conjuro de CLI memorizado es la mayor parte del valor del
archivo.

## Orden codificado

```makefile
node_modules: package.json package-lock.json
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi
	@touch node_modules

e2e: install
	npx start-server-and-test dev '$(WAIT_ON)' \
		"npx cypress run --e2e --browser $(BROWSER) $(SPEC_FLAG)"
```

`make e2e` desde un clon limpio instala dependencias, crea `cypress.env.json` a partir del ejemplo,
arranca los dos servidores, espera a que ambos respondan, ejecuta la suite y lo desmonta todo. El target
`node_modules` es un target de archivo real con prerrequisitos reales, así que se vuelve a ejecutar
cuando cambia `package.json` y se salta cuando no.

Un `cypress run` a secas asume todo eso y no te dice nada útil cuando la suposición falla.

## Composición

```makefile
verify: typecheck lint e2e component ## Everything CI runs

api-tests:
	$(MAKE) e2e CYPRESS_SPEC=cypress/e2e/api/*.cy.ts
```

`verify` es el contrato con CI. `api-tests` y `a11y` son el mismo target con un glob de specs distinto,
expresado una sola vez.

## Reglas que lo mantienen honesto

**Delega, no dupliques.** Todo target llama a un script de npm o a un binario. En el momento en que un
Makefile empieza a montar su propia línea de comandos de Cypress en paralelo a `package.json`, las dos
se desvían y nadie sabe cuál usa CI.

**No ocultes el comando.** Solo `help` y los targets de mantenimiento usan `@`. El resto muestra lo que
ejecuta, así que puedes copiar el comando real de la salida y depurarlo directamente.

**Declara `.PHONY`.** Los targets que no son archivos hay que listarlos, o un archivo perdido llamado
`build` en la raíz del repositorio hará que `make build` no haga nada.

**Fija la shell.** `.SHELLFLAGS := -eu -o pipefail -c` hace que un comando que falla dentro de una
receta haga fallar el target. Por defecto todo se considera exitoso salvo el último comando de una
tubería.

## Cuándo no merece la pena

Si tu proyecto tiene tres scripts de npm y todo el mundo los conoce, un Makefile es ceremonia. El umbral
está más o menos en: más de un proceso que arrancar, más de un modo del test runner, o cualquier orden
que alguien nuevo se equivocaría en adivinar. Este repositorio cumple las tres.
