# 11. Un único punto de entrada de tareas

*[English](../en/11-makefile-as-entrypoint.md) · [Español](../es/11-makefile-as-entrypoint.md)*

- Una sola superficie de comandos descubrible, para que nadie tenga que saber cuál de veinte scripts ejecutar.
- CI ejecuta los mismos targets que la gente ejecuta en local, así que el "en mi máquina funciona" no tiene dónde esconderse.
- El gestor de tareas delega en tus scripts existentes. Nunca los reimplementa.

Aquí se usa un Makefile como ejemplo porque está disponible en todas partes y no necesita ninguna
dependencia. El argumento se aplica igual a `just`, a `task` o a un conjunto bien organizado de scripts
de npm. Lo que importa es que haya exactamente un sitio donde mirar.

## Ayuda autodocumentada

```makefile
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
```

Cada target lleva un comentario `##` y aparece automáticamente. Un `make` a secas imprime la ayuda en
lugar de hacer algo, así que el primer comando de quien acaba de llegar es evidente e inofensivo.

Fíjate en el `0-9` de esa clase de caracteres. Sin él, targets como `e2e` y `a11y` desaparecen en
silencio de la ayuda, que es un buen ejemplo del tipo de error que invita este patrón.

## Variables donde importan

```bash
make e2e SPEC=cypress/e2e/projects/crud.cy.ts
make e2e BROWSER=chrome
```

```makefile
SPEC ?=
BROWSER ?= electron
SPEC_FLAG := $(if $(SPEC),--spec "$(SPEC)",)
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

`make e2e` desde un clon limpio instala dependencias, crea la configuración local a partir del ejemplo
versionado, arranca los servidores, espera a que respondan, ejecuta la suite y lo desmonta todo.

El target `node_modules` es un target de archivo real con prerrequisitos reales, así que se vuelve a
ejecutar cuando cambia `package.json` y se salta cuando no.

Un `cypress run` a secas asume todo eso y no te dice nada útil cuando la suposición falla. Ese hueco es
de donde vienen casi todos los avisos de "las pruebas no funcionan en mi máquina".

## Composición

```makefile
verify: typecheck lint e2e component ## Everything CI runs

api-tests:
	$(MAKE) e2e SPEC=cypress/e2e/api/*.cy.ts
```

`verify` es el contrato con CI. Los targets más específicos son el mismo target con un glob de specs
distinto, expresado una sola vez.

## Reglas que lo mantienen honesto

**Delega, no dupliques.** Todo target llama a un script o binario existente. En el momento en que el
gestor de tareas empieza a montar su propia línea de comandos de Cypress en paralelo a `package.json`,
las dos se desvían y nadie sabe cuál usa CI.

**No ocultes el comando.** Solo `help` y los targets de mantenimiento deberían silenciar la salida. El
resto muestra lo que ejecuta, así que puedes copiar el comando real y depurarlo directamente.

**Declara `.PHONY`.** Los targets que no son archivos hay que listarlos, o un archivo perdido llamado
`build` en la raíz del repositorio hará que `make build` no haga nada.

**Fija la shell.** `.SHELLFLAGS := -eu -o pipefail -c` hace que un comando que falla dentro de una receta
haga fallar el target. Por defecto todo se considera exitoso salvo el último comando de una tubería, lo
que esconde fallos reales.

## Cuándo no merece la pena

Si un proyecto tiene tres scripts y todo el mundo los conoce, esto es ceremonia. El umbral está más o
menos en: más de un proceso que arrancar, más de un modo de runner, o cualquier orden que alguien nuevo
se equivocaría en adivinar. Una suite de pruebas para una aplicación con sesión suele cumplir las tres.
