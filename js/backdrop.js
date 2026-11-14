const art = new Map();
const shown = new WeakMap();

function facts(item) {
    return {
        type: item.Type,
        backdrop: item.BackdropImageTags?.length > 0 || (Boolean(item.ParentBackdropItemId) && item.ParentBackdropImageTags?.length > 0),
        primary: Boolean(item.ImageTags?.Primary)
    };
}

function expected(item) {
    if (document.documentElement.classList.contains("layout-mobile")) {
        return item.type !== "Person" && item.type !== "Book" && (item.backdrop || item.primary);
    }
    return window.innerWidth >= 1000 && item.backdrop;
}

function apply(page, item) {
    page.classList.toggle("palatina-bare", !expected(item));
    return;
}

function show(event) {
    const page = event.target;
    if (!page.classList.contains("itemDetailPage")) {
        return;
    }
    const id = event.detail?.params?.id;
    const client = window.ApiClient;
    shown.set(page, id);
    if (art.has(id)) {
        apply(page, art.get(id));
        return;
    }
    page.classList.remove("palatina-bare");
    if (!id || !client) {
        return;
    }
    client.getItem(client.getCurrentUserId(), id).then((item) => {
        art.set(id, facts(item));
        if (shown.get(page) === id) {
            apply(page, art.get(id));
        }
        return;
    }).catch(() => null);
    return;
}

export function start() {
    document.addEventListener("viewshow", show);
    return;
}
