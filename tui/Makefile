BINARY = kv-netflix-tui
INSTALL_DIR = /usr/local/bin
VERSION = $(shell git describe --tags --always 2>/dev/null || echo "dev")

build:
	go build -ldflags="-w -s -X main.version=$(VERSION)" -o $(BINARY) .

install: build
	cp $(BINARY) $(INSTALL_DIR)/$(BINARY)
	@echo "Installed $(BINARY) to $(INSTALL_DIR)/$(BINARY)"
	@echo "Run: $(BINARY) --server https://your-server.com"

uninstall:
	rm -f $(INSTALL_DIR)/$(BINARY)

clean:
	rm -f $(BINARY) $(BINARY)-*

dev:
	go run . --server http://localhost:8000

# Cross-compile for all platforms
release: clean
	@mkdir -p release
	GOOS=linux   GOARCH=amd64 go build -ldflags="-w -s -X main.version=$(VERSION)" -o release/$(BINARY)-linux-amd64 .
	GOOS=linux   GOARCH=arm64 go build -ldflags="-w -s -X main.version=$(VERSION)" -o release/$(BINARY)-linux-arm64 .
	GOOS=darwin  GOARCH=amd64 go build -ldflags="-w -s -X main.version=$(VERSION)" -o release/$(BINARY)-darwin-amd64 .
	GOOS=darwin  GOARCH=arm64 go build -ldflags="-w -s -X main.version=$(VERSION)" -o release/$(BINARY)-darwin-arm64 .
	GOOS=windows GOARCH=amd64 go build -ldflags="-w -s -X main.version=$(VERSION)" -o release/$(BINARY)-windows-amd64.exe .
	@echo "---"
	@ls -lh release/

.PHONY: build install uninstall clean dev release
