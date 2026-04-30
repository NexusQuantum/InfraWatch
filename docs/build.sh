#!/bin/bash
# Hugo production build for InfraWatch docs.
# Pass --baseURL <url> to override the production base URL.

set -e
export PATH=/home/shiro/go-binary/bin:$PATH
export GOPATH=${GOPATH:-/home/shiro/go}

cd "$(dirname "$0")"
./bin/hugo --config hugo.prod.toml --minify "$@"
