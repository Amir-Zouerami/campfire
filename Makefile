PLUGIN_ID := dev.zouerami.campfire
PLUGIN_VERSION := $(shell sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' plugin.json | head -n 1)
BUNDLE_NAME := $(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz

SERVER_MAIN := ./server
SERVER_DIST := server/dist
WEBAPP_DIR := webapp
WEBAPP_DIST := webapp/dist
DIST_DIR := dist
BUNDLE_ROOT := $(DIST_DIR)/bundle-root

GOOS ?= linux
GOARCH ?= amd64

SERVER_TARGETS := \
	linux/amd64/plugin-linux-amd64 \
	linux/arm64/plugin-linux-arm64 \
	darwin/amd64/plugin-darwin-amd64 \
	darwin/arm64/plugin-darwin-arm64 \
	windows/amd64/plugin-windows-amd64.exe

.PHONY: help
help:
	@echo "Campfire build commands"
	@echo ""
	@echo "  make check             Run Go tests and TypeScript checks"
	@echo "  make build-server      Build one server executable for GOOS/GOARCH"
	@echo "  make build-server-all  Build all server executables declared in plugin.json"
	@echo "  make build-webapp      Build Vite React webapp bundle without re-running tsc"
	@echo "  make bundle            Build production plugin bundle tar.gz"
	@echo "  make bundle-check      Run checks once, then build production plugin bundle"
	@echo "  make clean             Remove build outputs"

.PHONY: check
check:
	go test ./...
	cd $(WEBAPP_DIR) && npm run check

.PHONY: build-server
build-server:
	mkdir -p $(SERVER_DIST)
	CGO_ENABLED=0 GOOS=$(GOOS) GOARCH=$(GOARCH) go build -trimpath -o $(SERVER_DIST)/plugin-$(GOOS)-$(GOARCH) $(SERVER_MAIN)

.PHONY: build-server-all
build-server-all:
	rm -rf $(SERVER_DIST)
	mkdir -p $(SERVER_DIST)
	@for target in $(SERVER_TARGETS); do \
		goos=$${target%%/*}; \
		rest=$${target#*/}; \
		goarch=$${rest%%/*}; \
		output=$${rest#*/}; \
		echo "Building server/dist/$$output for $$goos/$$goarch"; \
		CGO_ENABLED=0 GOOS=$$goos GOARCH=$$goarch go build -trimpath -o $(SERVER_DIST)/$$output $(SERVER_MAIN); \
	done

.PHONY: build-webapp
build-webapp:
	cd $(WEBAPP_DIR) && npx vite build

.PHONY: bundle-check
bundle-check: check bundle

.PHONY: bundle
bundle: build-server-all build-webapp
	rm -rf $(BUNDLE_ROOT)
	mkdir -p $(BUNDLE_ROOT)/server/dist
	mkdir -p $(BUNDLE_ROOT)/webapp/dist
	cp plugin.json $(BUNDLE_ROOT)/plugin.json
	cp -R assets $(BUNDLE_ROOT)/assets
	cp -R $(SERVER_DIST)/. $(BUNDLE_ROOT)/server/dist/
	cp -R $(WEBAPP_DIST)/. $(BUNDLE_ROOT)/webapp/dist/
	mkdir -p $(DIST_DIR)
	tar --format=ustar -C $(BUNDLE_ROOT) -czf $(DIST_DIR)/$(BUNDLE_NAME) \
		plugin.json \
		assets \
		server \
		server/dist \
		webapp \
		webapp/dist
	@echo "Created $(DIST_DIR)/$(BUNDLE_NAME)"

.PHONY: clean
clean:
	rm -rf $(SERVER_DIST)
	rm -rf $(DIST_DIR)
	rm -rf $(WEBAPP_DIST)
