import { library } from "./library.js";
import { player } from "./screens/player.js";

const preferences = ["mypreferencesdisplay", "mypreferenceshome", "mypreferencesplayback", "mypreferencessubtitles", "mypreferencescontrols", "quickconnect"];
const dashboard = ["", "activity", "backups", "branding", "devices", "keys", "libraries", "libraries/display", "libraries/metadata", "libraries/nfo", "livetv", "livetv/recordings", "logs", "networking", "playback/resume", "playback/streaming", "playback/transcoding", "playback/trickplay", "plugins", "plugins/repositories", "settings", "tasks", "users", "users/add"];
const userTabs = ["profile", "access", "parentalcontrol", "password"];
const sections = {
    movies: "movies",
    tvshows: "tv"
};

function slug(text) {
    return text.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function routes(page) {
    const content = await library(page);
    const user = await page.evaluate(() => window.ApiClient.getCurrentUserId());
    return [
        { name: "home", kind: "home", hash: "home" },
        { name: "favorites", kind: "home", hash: "home?tab=1" },
        ...content.views.map((view) => ({ name: view.type, kind: "library-" + view.type, hash: sections[view.type] + "?topParentId=" + view.id + "&collectionType=" + view.type })),
        ...content.items.map((item) => ({ name: "item-" + item.id, kind: item.type, hash: "details?id=" + item.id })),
        { name: "search", kind: "search", hash: "search" },
        { name: "search-results", kind: "search", hash: "search?query=harbor" },
        { name: "profile", kind: "preferences", hash: "userprofile?userId=" + user },
        { name: "mypreferencesmenu", kind: "preferences", hash: "mypreferencesmenu" },
        ...preferences.map((path) => ({ name: path, kind: "preferences", hash: path + "?userId=" + user })),
        ...dashboard.map((path) => ({ name: slug("dashboard " + path), kind: "dashboard", hash: "dashboard" + (path ? "/" + path : "") })),
        ...userTabs.map((tab) => ({ name: "dashboard-user-" + tab, kind: "dashboard", hash: "dashboard/users/" + user + "/" + tab })),
        { name: "player", kind: "player", open: player }
    ];
}

export const anonymous = [
    { name: "login", kind: "login", hash: "login" }
];
