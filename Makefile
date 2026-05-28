PLUGIN_ID := dev.zouerami.campfire
PLUGIN_VERSION := 0.1.0
BUNDLE_NAME := $(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz

SERVER_MAIN := ./server
SERVER_DIST := server/dist
WEBAPP_DIR := webapp
WEBAPP_DIST := webapp/dist
DIST_DIR := dist
BUNDLE_ROOT := $(DIST_DIR)/bundle-root

GOOS ?= linux
GOARCH ?= amd64

.PHONY: help
help:
	@echo "Campfire build commands"
	@echo ""
	@echo "  make check           Run Go tests and TypeScript checks"
	@echo "  make build-server    Build server executable for GOOS/GOARCH"
	@echo "  make build-webapp    Build Vite React webapp bundle without re-running tsc"
	@echo "  make bundle          Build plugin bundle tar.gz without tests/checks"
	@echo "  make bundle-check    Run checks once, then build plugin bundle"
	@echo "  make clean           Remove build outputs"

.PHONY: check
check:
	go test ./...
	cd $(WEBAPP_DIR) && npm run check

.PHONY: build-server
build-server:
	mkdir -p $(SERVER_DIST)
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -trimpath -o $(SERVER_DIST)/plugin-$(GOOS)-$(GOARCH) $(SERVER_MAIN)

.PHONY: build-webapp
build-webapp:
	cd $(WEBAPP_DIR) && npx vite build

.PHONY: bundle-check
bundle-check: check bundle

.PHONY: bundle
bundle: build-server build-webapp
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