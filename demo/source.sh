#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. demo/env.sh
if [ ! -d .cache/jellyfin-web ]; then
    git clone --quiet --depth 1 --branch "v$JELLYFIN_VERSION" https://github.com/jellyfin/jellyfin-web .cache/jellyfin-web
fi
echo ".cache/jellyfin-web at v$JELLYFIN_VERSION"
