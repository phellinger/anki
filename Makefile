include .env.target
export

# --- Docker Compose (dev) ---
COMPOSE_DEV := docker compose --env-file .env.dev -f docker-compose.dev.yml

# Browser origin for CORS when using host CRA (`make frontend-start` → http://localhost:3000).
# For Docker-only frontend (:3123): `FRONTEND_URL=http://localhost:3123 make dev-backend`
DEV_FRONTEND_URL ?= http://localhost:3000

# =============================================================================
# Local dev (recommended): MySQL + backend in Docker, CRA on the host
#   1. make dev-backend
#   2. make frontend-install    # once
#   3. make frontend-start      # http://localhost:3000
# Unset REACT_APP_API_URL in your shell so api.js uses '' + package.json "proxy".
# =============================================================================

.PHONY: dev
dev:
	@echo "Recommended workflow (backend in Docker, React on host):"
	@echo "  1. make dev-backend"
	@echo "  2. make frontend-install   # once"
	@echo "  3. make frontend-start     # http://localhost:3000"
	@echo "Unset REACT_APP_API_URL for local shell so the dev proxy works (see .env.dev)."
	@echo "If the backend image is missing npm packages: make backend-npm-install"

.PHONY: dev-backend
dev-backend:
	FRONTEND_URL=$(DEV_FRONTEND_URL) $(COMPOSE_DEV) up -d --build mysql backend

# Refresh backend dependencies inside Docker’s node_modules volume (needed after package.json changes).
.PHONY: backend-npm-install
backend-npm-install:
	$(COMPOSE_DEV) run --rm backend npm install

.PHONY: dev-backend-logs
dev-backend-logs:
	docker logs -f anki_backend

.PHONY: dev-backend-stop
dev-backend-stop:
	$(COMPOSE_DEV) stop mysql backend

.PHONY: dev-down
dev-down:
	$(COMPOSE_DEV) down

# Full stack in Docker (MySQL + backend + CRA container on :3123) — same as update-dev
.PHONY: dev-full
dev-full: update-dev

.PHONY: frontend-install
frontend-install:
	cd frontend && npm install

.PHONY: frontend-start
frontend-start:
	cd frontend && npm start

# Capacitor: build web app and copy into ios/android (requires Node 16+; Capacitor 6+ needs Node 18+)
.PHONY: cap-sync
cap-sync:
	cd frontend && npm run cap:sync

# iOS Simulator: boot Simulator, build + install, then launch com.ankitoday.app (full cap sync + xcodebuild pipeline).
# Default API in bundle: http://127.0.0.1:5193 — run make dev-backend first. Override: REACT_APP_API_URL=... make ios-sim-run
# Prefer this over Xcode ⌘R when you see a black WebView (stale ios/App/App/public vs native build).
.PHONY: ios-sim-run sim-run
ios-sim-run:
	@bash scripts/ios-sim-run.sh

sim-run: ios-sim-run

# Maestro: build + simctl install com.ankitoday.app (required before launchApp/clearState), then run flows.
# Example: MAESTRO_DRIVER_STARTUP_TIMEOUT=180000 make maestro-test
.PHONY: maestro-ios-install
maestro-ios-install:
	@device=$$(bash scripts/maestro-ensure-ios-sim.sh) || exit 1; \
	echo "Simulator: $$device"; \
	bash scripts/maestro-install-ios-app.sh "$$device" || exit 1

.PHONY: maestro-test
maestro-test:
	@device=$$(bash scripts/maestro-ensure-ios-sim.sh) || exit 1; \
	echo "Simulator: $$device"; \
	bash scripts/maestro-install-ios-app.sh "$$device" || exit 1; \
	maestro test maestro/flows/smoke_home.yaml --device "$$device"

.PHONY: maestro-test-offline
maestro-test-offline:
	@device=$$(bash scripts/maestro-ensure-ios-sim.sh) || exit 1; \
	echo "Simulator: $$device"; \
	bash scripts/maestro-install-ios-app.sh "$$device" || exit 1; \
	maestro test maestro/flows/smoke_offline.yaml --device "$$device"

# All flows that expect a reachable API (excludes smoke_offline.yaml, which needs identify to fail).
.PHONY: maestro-test-all
maestro-test-all:
	@device=$$(bash scripts/maestro-ensure-ios-sim.sh) || exit 1; \
	echo "Simulator: $$device"; \
	bash scripts/maestro-install-ios-app.sh "$$device" || exit 1; \
	flows=$$(find maestro/flows -maxdepth 1 -name '*.yaml' ! -name 'smoke_offline.yaml' | sort); \
	test -n "$$flows" || { echo 'No online Maestro flows under maestro/flows' >&2; exit 1; }; \
	maestro test $$flows --device "$$device"

# Maestro only (skip rebuild/install). Requires app already installed on the booted simulator.
.PHONY: maestro-test-only
maestro-test-only:
	@device=$$(bash scripts/maestro-ensure-ios-sim.sh) || exit 1; \
	maestro test maestro/flows/smoke_home.yaml --device "$$device"

# =============================================================================
# Remote / full Docker dev
# =============================================================================

.PHONY: update-prod
update-prod:
	rsync -avP --delete --exclude .git --exclude .DS_Store ./ $(TARGET_HOST):${TARGET_PATH}/
	ssh $(TARGET_HOST) "cd ${TARGET_PATH}; ./setup-prod.sh; docker ps"

.PHONY: update-dev
update-dev:
	./setup-dev.sh
	docker ps

# TODO: This is not working
.PHONY: reset-prod
reset-prod:
	rsync -avP --delete --exclude .git --exclude .DS_Store ./ $(TARGET_HOST):${TARGET_PATH}/
	ssh $(TARGET_HOST) "cd ${TARGET_PATH}; ./setup-prod.sh reset; docker ps"

.PHONY: reset-dev
reset-dev:
	./setup-dev.sh reset
	docker ps
