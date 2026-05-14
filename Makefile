PLUGIN_ID := dev.zouerami.campfire
PLUGIN_VERSION := 0.1.0
BUNDLE_NAME := $(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz

SERVER_MAIN := ./server
SERVER_DIST := server/dist
WEBAPP_DIST := webapp/dist
DIST_DIR := dist

GOOS ?= linux
GOARCH ?= amd64

.PHONY: help
help:
	@echo "Campfire build commands"
	@echo ""
	@echo "  make check          Run Go compile/test checks"
	@echo "  make build-server   Build server executable for GOOS/GOARCH"
	@echo "  make bundle         Build plugin bundle tar.gz"
	@echo "  make clean          Remove build outputs"

.PHONY: check
check:
	go test ./...

.PHONY: build-server
build-server:
	mkdir -p $(SERVER_DIST)
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -trimpath -o $(SERVER_DIST)/plugin-$(GOOS)-$(GOARCH) $(SERVER_MAIN)

.PHONY: ensure-placeholder-webapp
ensure-placeholder-webapp:
	mkdir -p $(WEBAPP_DIST)
	test -f $(WEBAPP_DIST)/main.js || printf "/** Temporary Campfire webapp placeholder. */\nconsole.info('Campfire webapp placeholder loaded.');\n" > $(WEBAPP_DIST)/main.js

.PHONY: bundle
bundle: check build-server ensure-placeholder-webapp
	mkdir -p $(DIST_DIR)
	tar -czf $(DIST_DIR)/$(BUNDLE_NAME) plugin.json assets $(SERVER_DIST) $(WEBAPP_DIST)
	@echo "Created $(DIST_DIR)/$(BUNDLE_NAME)"

.PHONY: clean
clean:
	rm -rf $(SERVER_DIST)
	rm -rf $(DIST_DIR)