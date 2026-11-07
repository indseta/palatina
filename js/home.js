const selector = ".MuiToolbar-root a.MuiButton-root[href='#/']";
const watched = new WeakSet();

function label() {
    return document.querySelector(".navMenuOption[href='#/home'] .navMenuOptionText")?.textContent.trim() || "Home";
}

function rename(link) {
    const texts = [...link.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
    texts.forEach((node, index) => {
        const value = index === 0 ? label() : "";
        if (node.data !== value) {
            node.data = value;
        }
        return;
    });
    return;
}

function watch(link) {
    if (watched.has(link)) {
        return;
    }
    watched.add(link);
    rename(link);
    new MutationObserver(() => rename(link)).observe(link, { childList: true, characterData: true, subtree: true });
    return;
}

function sweep(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    if (node.matches(selector)) {
        watch(node);
    }
    node.querySelectorAll(selector).forEach(watch);
    return;
}

export function start() {
    sweep(document.body);
    const observer = new MutationObserver((records) => {
        records.forEach((record) => record.addedNodes.forEach(sweep));
        return;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return;
}
