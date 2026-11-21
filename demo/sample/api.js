function params(hash) {
    return Object.fromEntries(new URLSearchParams(hash.split("?")[1] ?? ""));
}

function item(screens, id) {
    const screen = Object.values(screens).find((entry) => params(entry.hash).id === id);
    const backdrop = screen?.html.includes("class=\"backgroundContainer withBackdrop\"") ?? false;
    const primary = /<div[^>]*itemBackdrop[^>]*url\(/.test(screen?.html ?? "");
    return {
        Id: id,
        Type: screen?.kind,
        BackdropImageTags: backdrop ? ["sample"] : [],
        ImageTags: primary ? { Primary: "sample" } : {}
    };
}

export function viewParams(screen) {
    return params(screen.hash);
}

export function serveItems(screens) {
    window.ApiClient = {
        getCurrentUserId: () => "sample",
        getItem: (user, id) => Promise.resolve(item(screens, id))
    };
    return;
}
