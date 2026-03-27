#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# NQRust-InfraWatch Quick Installer
#
# Downloads the latest installer binary from GitHub Releases and runs the
# interactive TUI installer. Pass --non-interactive for scripted installs.
#
# Usage:
#   curl -fsSL https://github.com/NexusQuantum/InfraWatch/releases/latest/download/install.sh | bash
#   curl -fsSL .../install.sh | bash -s -- --non-interactive --mode full
# ──────────────────────────────────────────────────────────────────────────────
set -e

REPO="NexusQuantum/InfraWatch"
BINARY="infrawatch-installer"

# Colors
ORANGE='\033[38;2;255;80;1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${ORANGE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║         NQRust-InfraWatch Installer                  ║"
echo "║    Infrastructure Observability Dashboard            ║"
echo "║           by Nexus Quantum Tech                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check prerequisites ──────────────────────────────────────────────────────

if [ "$(id -u)" -ne 0 ]; then
    if ! command -v sudo &> /dev/null; then
        echo -e "${RED}Error: This script must be run as root or with sudo available${NC}"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed${NC}"
    exit 1
fi

# ── Detect architecture ──────────────────────────────────────────────────────

ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        TARGET="x86_64-linux-musl"
        ;;
    aarch64)
        TARGET="aarch64-linux-musl"
        ;;
    *)
        echo -e "${RED}Error: Unsupported architecture: ${ARCH}${NC}"
        echo ""
        echo "To build from source:"
        echo "  git clone https://github.com/${REPO}.git && cd InfraWatch/installer"
        echo "  cargo build --release"
        echo "  sudo ./target/release/${BINARY} install"
        exit 1
        ;;
esac

INSTALLER_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}-${TARGET}"

# ── Download ──────────────────────────────────────────────────────────────────

echo -e "${DIM}Downloading installer for ${ARCH}...${NC}"
echo -e "${DIM}URL: ${INSTALLER_URL}${NC}"
echo ""

if ! curl -fsSL "${INSTALLER_URL}" -o /tmp/${BINARY} 2>/tmp/infrawatch-installer-err; then
    echo -e "${RED}Error: Failed to download installer${NC}"
    echo ""
    echo "Possible causes:"
    echo "  • No release has been published yet"
    echo "  • Network connectivity issue"
    echo "  • Architecture ${ARCH} not available"
    echo ""
    echo "To build from source:"
    echo "  git clone https://github.com/${REPO}.git && cd InfraWatch/installer"
    echo "  cargo build --release"
    echo "  sudo ./target/release/${BINARY} install"
    echo ""
    echo "For offline/air-gapped environments, download the airgap bundle:"
    echo "  https://github.com/${REPO}/releases"
    exit 1
fi

if [ ! -s /tmp/${BINARY} ]; then
    echo -e "${RED}Error: Downloaded file is empty${NC}"
    exit 1
fi

chmod +x /tmp/${BINARY}
echo -e "${GREEN}Download complete.${NC}"
echo ""

# ── Verify ────────────────────────────────────────────────────────────────────

VERSION=$(/tmp/${BINARY} --version 2>/dev/null || echo "unknown")
echo -e "${DIM}${VERSION}${NC}"
echo ""

# ── Run installer ─────────────────────────────────────────────────────────────

echo "Starting installer..."
echo ""
exec $SUDO /tmp/${BINARY} install "$@"
