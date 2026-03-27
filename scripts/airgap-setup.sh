#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "NQRust-InfraWatch Offline Installer"
echo "===================================="
echo ""
echo "Bundle: ${SCRIPT_DIR}"
echo ""

# Run installer — use sudo only if not already root
if [ "$(id -u)" -eq 0 ]; then
  exec "${SCRIPT_DIR}/infrawatch-installer" install \
    --airgap \
    --bundle-path "${SCRIPT_DIR}" \
    "$@"
else
  exec sudo "${SCRIPT_DIR}/infrawatch-installer" install \
    --airgap \
    --bundle-path "${SCRIPT_DIR}" \
    "$@"
fi
