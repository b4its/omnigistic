# ============================================================================
# Omnigistic — Makefile (SvelteKit frontend + FastAPI backend + Docker + e2e)
# ----------------------------------------------------------------------------
# Semua target didokumentasikan; jalankan `make` atau `make help` untuk daftar.
# Tidak ada dependensi Make khusus (POSIX make). Butuh: python3, node/npm,
# docker + compose (hanya untuk target docker:*).
# ============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ---- Paths & tools ---------------------------------------------------------
BACKEND      := backend
FRONTEND     := frontend
SHARED       := shared
VENV         := $(BACKEND)/.venv
PY           := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip
UVICORN      := $(VENV)/bin/uvicorn
NPM          ?= npm
DC           ?= docker compose
COMPOSE_FILE ?= docker-compose.yml

# ---- Ports / host (override: `make backend-dev BACKEND_PORT=9000`) ---------
HOST           ?= 127.0.0.1
BACKEND_PORT   ?= 8000
FRONTEND_PORT  ?= 3100
PREVIEW_PORT   ?= 3101
SERVE_PORT     ?= 3102
# Port default untuk uji e2e (skrip frontend/scripts/*.mjs).
E2E_BASE ?= http://127.0.0.1:3104
E2E_API  ?= http://127.0.0.1:8000

# ---- Colours (auto-off bila bukan TTY) -------------------------------------
ifeq ($(shell test -t 1 && echo yes),yes)
    BOLD := \033[1m
    DIM  := \033[2m
    CYAN := \033[36m
    GRN  := \033[32m
    RST  := \033[0m
else
    BOLD :=
    DIM  :=
    CYAN :=
    GRN  :=
    RST  :=
endif

# ============================================================================
# help — daftar semua target (default)
# ============================================================================
.PHONY: help
help: ## Tampilkan daftar perintah ini
	@printf "$(BOLD)Omnigistic — $(CYAN)make$(RST) $(BOLD)targets$(RST)\n\n"
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-22s$(RST) %s\n", $$1, $$2}'
	@printf "\n$(DIM)Override contoh: $(CYAN)make backend-dev BACKEND_PORT=9000$(RST)\n"
	@printf "$(DIM)Tes cepat (hijau): $(CYAN)make check$(RST)\n"
	@printf "$(DIM)Jalanin stack Docker: $(CYAN)make up$(RST)  →  FE :3000 · API :8000$(RST)\n\n"

# ============================================================================
# Setup / install
# ============================================================================
.PHONY: venv
venv: ## Buat virtualenv backend (backend/.venv)
	@test -d $(VENV) || python3 -m venv $(VENV)
	@$(PIP) install --upgrade pip setuptools wheel >/dev/null
	@echo "✅ venv siap: $(VENV)"

.PHONY: install-backend
install-backend: venv ## Install dependensi Python backend (pip install -r)
	@$(PIP) install -r $(BACKEND)/requirements.txt
	@echo "✅ backend deps terpasang"

.PHONY: install-frontend
install-frontend: ## Install dependensi Node frontend (npm ci, fallback npm install)
	@cd $(FRONTEND) && (test -f package-lock.json && $(NPM) ci || $(NPM) install)
	@echo "✅ frontend deps terpasang"

.PHONY: install
install: install-backend install-frontend ## Install semua dependensi (backend + frontend)

# ============================================================================
# Dev (lokal, tanpa Docker)
# ============================================================================
.PHONY: backend-dev
backend-dev: ## Jalankan FastAPI dev (--reload) di BACKEND_PORT (default :8000)
	@cd $(BACKEND) && SKIP_DB=1 $(abspath $(UVICORN)) app.main:app \
		--host $(HOST) --port $(BACKEND_PORT) --reload

.PHONY: frontend-dev
frontend-dev: ## Jalankan SvelteKit dev server (vite, HMR) di FRONTEND_PORT (:3100)
	@cd $(FRONTEND) && $(NPM) run dev

.PHONY: dev
dev: ## Info menjalankan dev (butuh 2 terminal) + saran Docker
	@printf "$(BOLD)Mode dev lokal — jalankan di dua terminal:$(RST)\n"
	@printf "  1) $(CYAN)make backend-dev$(RST)   → API  http://$(HOST):$(BACKEND_PORT)\n"
	@printf "  2) $(CYAN)make frontend-dev$(RST)  → FE   http://$(HOST):$(FRONTEND_PORT)\n"
	@printf "\n$(DIM)Atau sekali jalan via Docker: $(CYAN)make up$(RST)$(DIM) (hot reload, tanpa DB).$(RST)\n"
	@printf "$(DIM)Swagger/API evidence: http://$(HOST):$(BACKEND_PORT)/docs$(RST)\n"

# ============================================================================
# Build / serve lokal
# ============================================================================
.PHONY: build-frontend
build-frontend: ## Build frontend produksi (vite build → .svelte-kit/output)
	@cd $(FRONTEND) && $(NPM) run build
	@echo "✅ build frontend selesai"

.PHONY: build
build: build-frontend ## Build artefak produksi (frontend)

.PHONY: backend-run
backend-run: ## Jalankan FastAPI tanpa reload (mirip prod) di BACKEND_PORT
	@cd $(BACKEND) && SKIP_DB=1 $(abspath $(UVICORN)) app.main:app \
		--host $(HOST) --port $(BACKEND_PORT)

.PHONY: frontend-serve
frontend-serve: build-frontend ## Serve build frontend (node build) di SERVE_PORT (:3102)
	@cd $(FRONTEND) && PORT=$(SERVE_PORT) HOST=$(HOST) node build/index.js

.PHONY: frontend-preview
frontend-preview: ## Preview build frontend (vite preview) di PREVIEW_PORT (:3101)
	@cd $(FRONTEND) && $(NPM) run preview -- --port $(PREVIEW_PORT)

# ============================================================================
# Quality — test, lint, typecheck
# ============================================================================
.PHONY: test-backend
test-backend: ## Uji backend (harness mandiri, SKIP_DB=1, tanpa server)
	@cd $(BACKEND) && SKIP_DB=1 $(abspath $(PY)) tests/run_tests.py

.PHONY: typecheck
typecheck: ## Typecheck frontend (svelte-check)
	@cd $(FRONTEND) && $(NPM) run check

.PHONY: test
test: test-backend typecheck ## Uji cepat: backend + typecheck frontend

.PHONY: lint-backend
lint-backend: ## Lint backend (ruff; menampilkan status repo saat ini)
	@cd $(BACKEND) && $(abspath $(PY)) -m ruff check app tests --statistics || true
	@cd $(BACKEND) && $(abspath $(PY)) -m ruff check app tests

.PHONY: lint-backend-changed
lint-backend-changed: ## Lint backend hanya berkas .py yang berubah (vs origin/main, fallback HEAD~1)
	@cd $(BACKEND) && base="$$(git rev-parse --verify -q origin/main || echo HEAD~1)"; \
		files="$$(git diff --name-only --diff-filter=ACMR "$$base"...HEAD -- '*.py' | sed 's#^backend/##')"; \
		if [ -z "$$files" ]; then echo "ℹ  tidak ada berkas .py berubah vs $$base"; else \
			echo "▶ ruff ($$base...HEAD): $$files"; $(abspath $(PY)) -m ruff check $$files; fi

.PHONY: lint-frontend
lint-frontend: ## Lint frontend (eslint)
	@cd $(FRONTEND) && $(NPM) run lint

.PHONY: lint
lint: lint-backend lint-frontend ## Lint semua (backend + frontend)

.PHONY: fmt-backend
fmt-backend: ## Rapikan otomatis backend (ruff check --fix)
	@cd $(BACKEND) && $(abspath $(PY)) -m ruff check app tests --fix

.PHONY: fmt-frontend
fmt-frontend: ## Rapikan otomatis frontend (prettier)
	@cd $(FRONTEND) && npx prettier --write "src/**/*.{ts,svelte}"

.PHONY: check
check: test ## Gerbang cepat (hijau): uji backend + typecheck frontend

.PHONY: verify
verify: test validate-data ## Verifikasi menyeluruh yang dijamin hijau (test + data + typecheck)

# ============================================================================
# E2E (butuh FE & BE sudah jalan)
# ============================================================================
.PHONY: e2e
e2e: ## Uji e2e utama (butuh server FE & BE jalan; E2E_BASE/E2E_API)
	@cd $(FRONTEND) && E2E_BASE=$(E2E_BASE) E2E_API=$(E2E_API) node scripts/e2e.mjs

.PHONY: e2e-engines
e2e-engines: ## Uji e2e mesin analitik (ML endpoints)
	@cd $(FRONTEND) && E2E_BASE=$(E2E_BASE) E2E_API=$(E2E_API) node scripts/e2e-engines.mjs

.PHONY: e2e-sims
e2e-sims: ## Uji e2e simulasi interaktif
	@cd $(FRONTEND) && E2E_BASE=$(E2E_BASE) E2E_API=$(E2E_API) node scripts/e2e-sims.mjs

.PHONY: e2e-case
e2e-case: ## Uji e2e alur studi kasus end-to-end
	@cd $(FRONTEND) && E2E_BASE=$(E2E_BASE) E2E_API=$(E2E_API) node scripts/e2e-case.mjs

.PHONY: e2e-help
e2e-help: ## Info prasyarat menjalankan uji e2e
	@printf "$(BOLD)Prasyarat e2e:$(RST)\n"
	@printf "  1) $(CYAN)make backend-dev$(RST)    (API di $(E2E_API))\n"
	@printf "  2) $(CYAN)make frontend-dev$(RST)   (FE di $(E2E_BASE) — atur E2E_BASE bila beda port)\n"
	@printf "  3) $(CYAN)make e2e$(RST)            (skrip: frontend/scripts/e2e.mjs)\n"
	@printf "\n$(DIM)Skrip lain: e2e-engines, e2e-sims, e2e-case, e2e-orders, e2e-offline, dst.$(RST)\n"

# ============================================================================
# Data
# ============================================================================
.PHONY: validate-data
validate-data: ## Validasi JSON sumber tunggal (shared/data-kas.json)
	@$(PY) $(BACKEND)/tests/validate_data.py

.PHONY: seed
seed: ## Seed data ke Postgres lokal (butuh DB jalan + SKIP_DB=0)
	@cd $(BACKEND) && SKIP_DB=0 $(abspath $(PY)) -c "import sys;sys.path.insert(0,'.');from app.db.seed import seed;print('seed:',seed())"

# ============================================================================
# Docker
# ============================================================================
.PHONY: up
up: ## Docker DEV + hot reload (FE :3000 · API :8000 · tanpa DB)
	@$(DC) up -d --build

.PHONY: up-db
up-db: ## Docker DEV + Postgres lokal (profile db) + auto-seed
	@$(DC) --profile db up -d --build

.PHONY: up-prod
up-prod: ## Docker PROD (image build, tanpa bind mount) + Postgres
	@$(DC) --profile prod up -d --build

.PHONY: down
down: ## Hentikan semua container
	@$(DC) down

.PHONY: down-v
down-v: ## Hentikan + hapus volume (db & data) — bersih total
	@$(DC) down -v --remove-orphans

.PHONY: restart
restart: down up ## Restart stack Docker (dev)

.PHONY: logs
logs: ## Ikuti log semua container
	@$(DC) logs -f

.PHONY: logs-backend
logs-backend: ## Ikuti log container backend
	@$(DC) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## Ikuti log container frontend
	@$(DC) logs -f frontend

.PHONY: ps
ps: ## Status container
	@$(DC) ps

.PHONY: config
config: ## Validasi & tampilkan konfigurasi compose hasil render
	@$(DC) config

.PHONY: seed-docker
seed-docker: ## Jalankan seeder Postgres di container (profile db, one-shot)
	@$(DC) --profile db run --rm db-seed

.PHONY: sh-backend
sh-backend: ## Shell masuk container backend
	@$(DC) exec backend sh

.PHONY: sh-frontend
sh-frontend: ## Shell masuk container frontend
	@$(DC) exec frontend sh

.PHONY: db-shell
db-shell: ## Masuk psql Postgres lokal (profile db)
	@$(DC) --profile db exec db psql -U omnigistic -d omnigistic

# ============================================================================
# Clean
# ============================================================================
.PHONY: clean-backend
clean-backend: ## Hapus cache backend (__pycache__, .ruff_cache)
	@find $(BACKEND) -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	@rm -rf $(BACKEND)/.ruff_cache $(BACKEND)/.pytest_cache
	@echo "✅ cache backend dibersihkan"

.PHONY: clean-frontend
clean-frontend: ## Hapus artefak build frontend (build/, .svelte-kit/)
	@rm -rf $(FRONTEND)/build $(FRONTEND)/.svelte-kit
	@echo "✅ artefak frontend dibersihkan"

.PHONY: clean
clean: clean-backend clean-frontend ## Bersihkan cache & artefak build

.PHONY: clean-docker
clean-docker: ## Hentikan + hapus volume & image omnigistic
	@$(DC) down -v --remove-orphans || true
	@docker image prune -f --filter "label=com.docker.compose.project=omnigistic" 2>/dev/null || true
	@echo "✅ bersih Docker omnigistic"

.PHONY: clean-all
clean-all: clean clean-docker ## Bersih total (cache + artefak + docker)

# ============================================================================
# Meta
# ============================================================================
.PHONY: version
version: ## Tampilkan versi tool (python, node, npm, docker)
	@printf "$(BOLD)Versi tool:$(RST)\n"
	@printf "  python3 : %s\n" "$$(python3 --version 2>/dev/null || echo '—')"
	@printf "  node    : %s\n" "$$(node --version 2>/dev/null || echo '—')"
	@printf "  npm     : %s\n" "$$(npm --version 2>/dev/null || echo '—')"
	@printf "  ruff    : %s\n" "$$($(PY) -m ruff --version 2>/dev/null || echo '— (jalankan: make venv)')"
	@printf "  docker  : %s\n" "$$(docker --version 2>/dev/null || echo '—')"

.PHONY: status
status: ## Ringkasan status: git + container
	@printf "$(BOLD)Git:$(RST)\n"
	@git status -s || true
	@printf "\n$(BOLD)Container:$(RST)\n"
	@$(DC) ps || true

.PHONY: routes
routes: ## Daftar endpoint backend (dari OpenAPI) — butuh backend jalan
	@curl -fsS http://$(HOST):$(BACKEND_PORT)/openapi.json \
		| $(PY) -c "import json,sys; d=json.load(sys.stdin); [print(' ', p) for p in sorted(d.get('paths',{}))]" \
		|| echo "⚠  backend belum jalan di http://$(HOST):$(BACKEND_PORT) (coba: make backend-dev)"
