#!/bin/sh
set -eu
. demo/env.sh
json="Content-Type: application/json"
if curl -fs "$DEMO_URL/System/Info/Public" | grep -qi '"StartupWizardCompleted":false'; then
    until curl -fs -X POST "$DEMO_URL/Startup/Configuration" -H "$json" -d '{"UICulture":"en-US","MetadataCountryCode":"US","PreferredMetadataLanguage":"en"}'; do
        sleep 1
    done
    curl -fs "$DEMO_URL/Startup/User" >/dev/null
    curl -fs -X POST "$DEMO_URL/Startup/User" -H "$json" -d "{\"Name\":\"$DEMO_USER\",\"Password\":\"$DEMO_PASSWORD\"}"
    curl -fs -X POST "$DEMO_URL/Startup/RemoteAccess" -H "$json" -d '{"EnableRemoteAccess":true}'
    curl -fs -X POST "$DEMO_URL/Startup/Complete"
fi
client='MediaBrowser Client="palatina", Device="demo", DeviceId="palatina-demo", Version="1"'
token=$(curl -fs -X POST "$DEMO_URL/Users/AuthenticateByName" -H "$json" -H "Authorization: $client" -d "{\"Username\":\"$DEMO_USER\",\"Pw\":\"$DEMO_PASSWORD\"}" | sed 's/.*"[Aa]ccessToken":"\([^"]*\)".*/\1/')
auth="Authorization: MediaBrowser Token=$token"
library() {
    if ! curl -fs "$DEMO_URL/Library/VirtualFolders" -H "$auth" | grep -qi "\"Name\":\"$1\""; then
        curl -fs -X POST "$DEMO_URL/Library/VirtualFolders?name=$1&collectionType=$2&paths=/media/$1&refreshLibrary=false" -H "$auth" -H "$json" -d '{}'
    fi
    return 0
}
library Movies movies
library Shows tvshows
curl -fs -X POST "$DEMO_URL/System/Configuration/branding" -H "$auth" -H "$json" -d "{\"CustomCss\":\"@import url(\\\"$CDN/css/palatina.css\\\");\",\"SplashscreenEnabled\":false}"
curl -fs -X POST "$DEMO_URL/Plugins/f5a34f7b-2e8a-4e6a-a722-3a216a81b374/Configuration" -H "$auth" -H "$json" -d "{\"AllowExternalScriptUrls\":true,\"CustomJavaScripts\":[{\"Name\":\"Palatina\",\"Src\":\"$CDN/js/palatina.js\",\"Module\":true,\"Enabled\":true}],\"PluginJavaScripts\":[]}"
count() {
    curl -fs "$DEMO_URL/Items?IncludeItemTypes=$1&Recursive=true&Limit=0" -H "$auth" | sed 's/.*"TotalRecordCount":\([0-9]*\).*/\1/I'
    return 0
}
until [ "$(count Movie)" = "$(grep -c '^movie|' demo/catalog.txt)" ] && [ "$(count Episode)" = "$(( $(grep -c '^series|' demo/catalog.txt) * 5 ))" ]; do
    if curl -fs "$DEMO_URL/ScheduledTasks" -H "$auth" | sed 's/},{"Name"/}\n{"Name"/g' | grep '"Key":"RefreshLibrary"' | grep -q '"State":"Idle"'; then
        curl -fs -X POST "$DEMO_URL/Library/Refresh" -H "$auth"
    fi
    sleep 5
done
DEMO_URL="$DEMO_URL" DEMO_TOKEN="$token" node demo/seed.js
