#!/bin/bash
# =============================================================================
# Bundle .deb packages for Ubuntu 24.04 (air-gapped installation)
# =============================================================================
# Downloads all required .deb packages and their dependencies for offline
# installation on Ubuntu 24.04 servers. Uses Docker containers to resolve the
# correct dependencies for the target Ubuntu version.
#
# Based on NQRust-MicroVM's bundle-debs-ubuntu.sh
#
# Requirements: Docker installed and running
# Usage: ./bundle-debs-ubuntu.sh [--output <dir>] [--version 24.04]
# =============================================================================

set -euo pipefail

OUTPUT_DIR="./output/debs"
TARGET_VERSION="24.04"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)  OUTPUT_DIR="$2"; shift 2 ;;
        --version) TARGET_VERSION="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: $(basename "$0") [--output <dir>] [--version 24.04]"
            exit 0
            ;;
        *) shift ;;
    esac
done

# Packages required by InfraWatch
PACKAGES=(
    # Database
    "postgresql"
    "postgresql-contrib"
    # System utilities
    "curl"
    "ca-certificates"
    "sudo"
    "openssl"
    "git"
    "unzip"
    "screen"
    "lsof"
    "net-tools"
)

PACKAGE_LIST="${PACKAGES[*]}"

echo "[INFO] Downloading .deb packages for Ubuntu ${TARGET_VERSION}..."
mkdir -p "${OUTPUT_DIR}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[WARN] Docker not found. Falling back to local apt-get download."
    echo "[WARN] Dependencies may be incomplete for the target system."
    mkdir -p "${OUTPUT_DIR}"
    cd "${OUTPUT_DIR}"
    sudo apt-get update -qq >/dev/null 2>&1
    DEPS=$(apt-cache depends --recurse --no-recommends --no-suggests \
        --no-conflicts --no-breaks --no-replaces --no-enhances \
        ${PACKAGE_LIST} 2>/dev/null \
        | grep '^\w' | grep -v '^<' | sort -u)
    apt-get download ${DEPS} 2>/dev/null || true
    echo "[OK] Downloaded $(ls -1 *.deb 2>/dev/null | wc -l) packages (fallback mode)"
    exit 0
fi

docker pull "ubuntu:${TARGET_VERSION}" >/dev/null 2>&1

# Write the download script — runs inside the Docker container
SCRIPT_FILE=$(mktemp /tmp/infrawatch-deb-download-XXXXXX.sh)
cat > "${SCRIPT_FILE}" << 'DOWNLOAD_SCRIPT'
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# Update package lists
apt-get update -qq >/dev/null 2>&1

# Install prerequisites for adding Docker's APT repository
apt-get install -y -qq ca-certificates curl gnupg >/dev/null 2>&1

# Add Docker's official GPG key and repository
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
ARCH=$(dpkg --print-architecture)
CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq >/dev/null 2>&1

# Resolve all dependencies recursively (system packages + Docker)
DOCKER_PKGS="docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
DEPS=$(apt-cache depends --recurse --no-recommends --no-suggests \
    --no-conflicts --no-breaks --no-replaces --no-enhances \
    $SYSTEM_PACKAGES ${DOCKER_PKGS} 2>/dev/null \
    | grep '^\w' \
    | grep -v '^<' \
    | sort -u)

# Download all packages
cd /tmp
apt-get download ${DEPS} 2>/dev/null || true

# Copy to output
cp /tmp/*.deb /output/ 2>/dev/null || true

# Count and report
PKG_COUNT=$(ls -1 /output/*.deb 2>/dev/null | wc -l)
echo "Downloaded ${PKG_COUNT} packages"
DOWNLOAD_SCRIPT

# Run the script inside a container with the package list as env var
docker run --rm \
    -v "${OUTPUT_DIR}:/output" \
    -v "${SCRIPT_FILE}:/download.sh:ro" \
    -e "SYSTEM_PACKAGES=${PACKAGE_LIST}" \
    "ubuntu:${TARGET_VERSION}" \
    bash /download.sh

rm -f "${SCRIPT_FILE}"

PKG_COUNT=$(ls -1 "${OUTPUT_DIR}"/*.deb 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${OUTPUT_DIR}" 2>/dev/null | cut -f1)

if [[ "${PKG_COUNT}" -gt 0 ]]; then
    echo "[OK] Ubuntu ${TARGET_VERSION}: ${PKG_COUNT} packages (${TOTAL_SIZE})"
else
    echo "[ERROR] No packages downloaded!"
    exit 1
fi
