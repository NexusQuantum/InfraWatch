#!/bin/bash
# Hugo development server for InfraWatch docs.
# Uses the vendored hugo binary in bin/ so there is no system Hugo dependency.
# Binds to 0.0.0.0 so other machines on the same LAN can reach the docs.
# Pass a custom base URL to make LiveReload work from LAN:
#   bash serve.sh http://192.168.1.42:1313/

set -e
export PATH=/home/shiro/go-binary/bin:$PATH
export GOPATH=${GOPATH:-/home/shiro/go}

cd "$(dirname "$0")"

PORT="${PORT:-1313}"

# Pick the first non-loopback IPv4 as the default LAN base URL.
DEFAULT_IP="$(ip -4 -br addr show 2>/dev/null \
  | awk '$1!~/^(lo|docker|br-|veth)/ && $3 ~ /[0-9]+\./ {split($3,a,"/"); print a[1]; exit}')"
DEFAULT_BASEURL="http://${DEFAULT_IP:-0.0.0.0}:${PORT}/"

BASEURL="${1:-$DEFAULT_BASEURL}"

echo "Serving on http://0.0.0.0:${PORT}/"
echo "LAN access:  ${BASEURL}"
echo

./bin/hugo server \
  --config hugo.dev.toml \
  --buildDrafts \
  --bind 0.0.0.0 \
  --port "${PORT}" \
  --baseURL "${BASEURL}" \
  --appendPort=false \
  --disableFastRender
