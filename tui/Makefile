BINARY=kv-netflix-tui
INSTALL_DIR=/usr/local/bin

build:
	go build -o $(BINARY) .

install: build
	cp $(BINARY) $(INSTALL_DIR)/$(BINARY)
	@echo "Installed $(BINARY) to $(INSTALL_DIR)/$(BINARY)"
	@echo "Run: $(BINARY) --server https://nf.khoavo.myds.me"

uninstall:
	rm -f $(INSTALL_DIR)/$(BINARY)
	@echo "Removed $(BINARY)"

clean:
	rm -f $(BINARY)

dev:
	go run . --server http://localhost:8000

docker:
	go build -o $(BINARY) .

.PHONY: build install uninstall clean dev docker
