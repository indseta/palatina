#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. demo/env.sh
mkdir -p "$DEMO_DIR/config/plugins" "$DEMO_DIR/cache" "$DEMO_DIR/media"
sh demo/media.sh "$DEMO_DIR/media"
plugin="$DEMO_DIR/config/plugins/JavaScript Injector_$INJECTOR_VERSION.0"
if [ ! -f "$plugin/Jellyfin.Plugin.JavaScriptInjector.dll" ]; then
    mkdir -p "$plugin"
    curl -fsSL -o "$DEMO_DIR/injector.zip" "https://github.com/n00bcodr/Jellyfin-JavaScript-Injector/releases/latest/download/Jellyfin.Plugin.JavaScriptInjector_$INJECTOR_VERSION.zip"
    unzip -o -q "$DEMO_DIR/injector.zip" -d "$plugin"
fi
if [ -z "$(docker ps -q -f "name=^$DEMO_NAME$")" ]; then
    docker rm -f "$DEMO_NAME" >/dev/null 2>&1 || true
    docker run -d --name "$DEMO_NAME" --network host -v "$PWD/$DEMO_DIR/config:/config" -v "$PWD/$DEMO_DIR/cache:/cache" -v "$PWD/$DEMO_DIR/media:/media:ro" "jellyfin/jellyfin:$JELLYFIN_VERSION" >/dev/null
fi
until curl -fs "$DEMO_URL/System/Info/Public" >/dev/null; do sleep 1; done
sh demo/setup.sh
echo "Jellyfin $JELLYFIN_VERSION demo at $DEMO_URL ($DEMO_USER / $DEMO_PASSWORD)"
