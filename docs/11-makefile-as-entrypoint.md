# 11. The Makefile as the entrypoint

- One discoverable command surface: `make help`. No tribal knowledge about which npm script to run.
- CI runs the same targets you do, so "works on my machine" has nowhere to hide.
- The Makefile delegates to npm scripts. It never reimplements them.

## Self-documenting help

```makefile
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
```

Every target carries a `##` comment and shows up automatically. Bare `make` prints the help rather
than doing something. A new contributor's first command is obvious and harmless.

Note the `0-9` in that character class. Without it, `e2e` and `a11y` silently vanish from the help
output, which is a nicely representative example of the bug this pattern invites.

## Variables where you actually need them

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

The single-spec loop is the one you use fifty times a day while writing a test. Making it a variable
instead of a memorised CLI incantation is most of the value of the file.

## Encoded ordering

```makefile
node_modules: package.json package-lock.json
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi
	@touch node_modules

e2e: install
	npx start-server-and-test dev '$(WAIT_ON)' \
		"npx cypress run --e2e --browser $(BROWSER) $(SPEC_FLAG)"
```

`make e2e` from a clean checkout installs dependencies, creates `cypress.env.json` from the example,
starts both servers, waits for both to answer, runs the suite, and tears everything down. The
`node_modules` target is a real file target with real prerequisites, so it re-runs when
`package.json` changes and is skipped otherwise.

A bare `cypress run` assumes all of that and tells you nothing useful when the assumption is wrong.

## Composition

```makefile
verify: typecheck lint e2e component ## Everything CI runs

api-tests:
	$(MAKE) e2e CYPRESS_SPEC=cypress/e2e/api/*.cy.ts
```

`verify` is the contract with CI. `api-tests` and `a11y` are the same target with a different spec
glob, expressed once.

## Rules that keep it honest

**Delegate, do not duplicate.** Every target calls an npm script or a binary. The moment a Makefile
starts assembling its own Cypress command line in parallel with `package.json`, the two drift and
nobody knows which one CI uses.

**Do not hide the command.** Only `help` and the housekeeping targets use `@`. Everything else echoes
what it runs, so you can copy the real command out of the output and debug it directly.

**Declare `.PHONY`.** Targets that are not files must be listed, or a stray file named `build` in the
repo root will make `make build` do nothing.

**Set the shell.** `.SHELLFLAGS := -eu -o pipefail -c` makes a failing command in a recipe fail the
target. The default is silent success on everything but the last command in a pipe.

## When not to bother

If your project has three npm scripts and everyone knows them, a Makefile is ceremony. The threshold
is roughly: more than one process to start, more than one test runner mode, or any ordering that a
newcomer would get wrong. This repo hits all three.
