# 11. A single task entrypoint

*[English](../en/11-makefile-as-entrypoint.md) · [Español](../es/11-makefile-as-entrypoint.md)*

- One discoverable command surface, so nobody has to know which of twenty scripts to run.
- CI runs the same targets people run locally, so "works on my machine" has nowhere to hide.
- The task runner delegates to your existing scripts. It never reimplements them.

A Makefile is the example used here because it is available everywhere and needs no dependency. The
argument applies equally to `just`, `task`, or a well-organised set of npm scripts. What matters is
that there is exactly one place to look.

## Self-documenting help

```makefile
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
```

Every target carries a `##` comment and appears automatically. A bare `make` prints the help rather
than doing something, so a newcomer's first command is obvious and harmless.

Note the `0-9` in that character class. Without it, targets like `e2e` and `a11y` vanish silently
from the help output, which is a fair example of the bug this pattern invites.

## Variables where they matter

```bash
make e2e SPEC=cypress/e2e/projects/crud.cy.ts
make e2e BROWSER=chrome
```

```makefile
SPEC ?=
BROWSER ?= electron
SPEC_FLAG := $(if $(SPEC),--spec "$(SPEC)",)
```

The single-spec loop is the one you use fifty times a day while writing a test. Turning it into a
variable instead of a memorised CLI incantation is most of the value of the file.

## Encoded ordering

```makefile
node_modules: package.json package-lock.json
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi
	@touch node_modules

e2e: install
	npx start-server-and-test dev '$(WAIT_ON)' \
		"npx cypress run --e2e --browser $(BROWSER) $(SPEC_FLAG)"
```

`make e2e` from a clean checkout installs dependencies, creates local config from the committed
example, starts the servers, waits for them to answer, runs the suite, and tears everything down.

The `node_modules` target is a real file target with real prerequisites, so it re-runs when
`package.json` changes and is skipped otherwise.

A bare `cypress run` assumes all of that and tells you nothing useful when the assumption is wrong.
That gap is where most "the tests don't work on my machine" reports come from.

## Composition

```makefile
verify: typecheck lint e2e component ## Everything CI runs

api-tests:
	$(MAKE) e2e SPEC=cypress/e2e/api/*.cy.ts
```

`verify` is the contract with CI. Narrower targets are the same target with a different spec glob,
expressed once.

## Rules that keep it honest

**Delegate, do not duplicate.** Every target calls an existing script or binary. The moment the task
runner starts assembling its own Cypress command line in parallel with `package.json`, the two drift
and nobody knows which one CI uses.

**Do not hide the command.** Only `help` and housekeeping targets should suppress output. Everything
else echoes what it runs, so you can copy the real command and debug it directly.

**Declare `.PHONY`.** Targets that are not files must be listed, or a stray file named `build` in the
repository root will make `make build` do nothing.

**Set the shell.** `.SHELLFLAGS := -eu -o pipefail -c` makes a failing command inside a recipe fail
the target. The default is silent success on everything but the last command in a pipe, which hides
real failures.

## When not to bother

If a project has three scripts and everyone knows them, this is ceremony. The threshold is roughly:
more than one process to start, more than one runner mode, or any ordering a newcomer would get
wrong. A test suite for a signed-in application usually hits all three.
