# Single entrypoint for every task in this repo.
#
# `make help` lists everything. CI runs the same targets you run locally, so a
# green build here means a green build there.

.DEFAULT_GOAL := help
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# Run one spec instead of all of them:
#   make e2e CYPRESS_SPEC=cypress/e2e/todos/crud.cy.ts
CYPRESS_SPEC ?=
BROWSER ?= electron

SPEC_FLAG := $(if $(CYPRESS_SPEC),--spec "$(CYPRESS_SPEC)",)
WAIT_ON := http://localhost:5180|http://localhost:3001/api/health

.PHONY: help install dev dev-api dev-web build lint lint-fix typecheck verify \
        open open-ct e2e component api-tests a11y reset-db clean \
        docs docs-build docs-preview

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

node_modules: package.json package-lock.json
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi
	@touch node_modules

cypress.env.json: cypress.env.example.json
	@echo "Creating cypress.env.json from the example. Fill in real values for a real environment."
	@cp cypress.env.example.json cypress.env.json

install: node_modules cypress.env.json ## Install dependencies and create a local cypress.env.json

dev: install ## Run the API and the client together
	npm run dev

dev-api: install ## Run only the Express API (port 3001, test routes on)
	npm run dev:server

dev-web: install ## Run only the Vite client (port 5180)
	npm run dev:client

build: install ## Build the client
	npm run build

lint: install ## Lint everything
	npm run lint

lint-fix: install ## Lint and autofix
	npm run lint:fix

typecheck: install ## Type-check the app, the server and the specs
	npm run typecheck

open: install ## Open Cypress in E2E mode with both servers running
	npx start-server-and-test dev '$(WAIT_ON)' cy:open

open-ct: install ## Open Cypress in component mode
	npm run cy:open:ct

e2e: install ## Run the E2E suite headlessly
	npx start-server-and-test dev '$(WAIT_ON)' \
		"npx cypress run --e2e --browser $(BROWSER) $(SPEC_FLAG)"

component: install ## Run the component suite headlessly
	npx cypress run --component --browser $(BROWSER) $(SPEC_FLAG)

api-tests: ## Run only the API contract specs (fast feedback loop)
	$(MAKE) e2e CYPRESS_SPEC=cypress/e2e/api/*.cy.ts

a11y: ## Run only the accessibility specs
	$(MAKE) e2e CYPRESS_SPEC=cypress/e2e/a11y/*.cy.ts

docs: install ## Serve the docs site locally with hot reload
	npm run docs:dev

docs-build: install ## Build the docs site into docs/.vitepress/dist
	npm run docs:build

docs-preview: docs-build ## Serve the built docs site
	npm run docs:preview

verify: typecheck lint e2e component docs-build ## Everything CI runs

reset-db: ## Reset the API's state (requires `make dev` in another terminal)
	curl -fsS -X POST http://localhost:3001/api/test/reset && echo "  reset ok"

clean: ## Remove build output and Cypress artifacts
	rm -rf dist cypress/screenshots cypress/videos cypress/downloads \
		docs/.vitepress/dist docs/.vitepress/cache
