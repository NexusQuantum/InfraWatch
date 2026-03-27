#!/usr/bin/env bash
# InfraWatch Quick Installer
# Downloads and runs the Rust TUI installer binary
set -e

REPO="NexusQuantum/InfraWatch"
BINARY="infrawatch-installer"
INSTALLER_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}-x86_64-linux-musl"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║          InfraWatch Installer                    ║"
echo "║    Infrastructure Observability Dashboard        ║"
echo "║          by Nexus Quantum Tech                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for root/sudo
if [ "$(id -u)" -ne 0 ]; then
    if ! command -v sudo &> /dev/null; then
        echo -e "${RED}Error: This script must be run as root or with sudo available${NC}"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        INSTALLER_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}-x86_64-linux-musl"
        ;;
    aarch64)
        INSTALLER_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}-aarch64-linux-musl"
        ;;
    *)
        echo -e "${RED}Error: Unsupported architecture: ${ARCH}${NC}"
        echo "Please build from source:"
        echo "  git clone https://github.com/${REPO}.git && cd InfraWatch/installer"
        echo "  cargo build --release"
        echo "  sudo ./target/release/${BINARY} install"
        exit 1
        ;;
esac

# Check for curl
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed${NC}"
    exit 1
fi

echo "Downloading installer..."
if ! curl -fsSL "${INSTALLER_URL}" -o /tmp/${BINARY} 2>/tmp/infrawatch-installer-err; then
    echo -e "${RED}Error: Failed to download installer${NC}"
    echo ""
    echo "To build from source:"
    echo "  git clone https://github.com/${REPO}.git && cd InfraWatch/installer"
    echo "  cargo build --release"
    echo "  sudo ./target/release/${BINARY} install"
    exit 1
fi

# Verify download
if [ ! -s /tmp/${BINARY} ]; then
    echo -e "${RED}Error: Downloaded file is empty${NC}"
    exit 1
fi

chmod +x /tmp/${BINARY}
echo -e "${GREEN}Download complete.${NC}"
echo "Starting installer..."
echo ""

# Run installer
exec $SUDO /tmp/${BINARY} install "$@"
