const selector = ".sectionTitleTextButton[href]";

function plain(link) {
    link.removeAttribute("href");
    link.setAttribute("tabindex", "-1");
    return;
}

function sweep(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    if (node.matches(selector)) {
        plain(node);
    }
    node.querySelectorAll(selector).forEach(plain);
    return;
}

export function start() {
    sweep(document.body);
    const observer = new MutationObserver((records) => {
        records.forEach((record) => {
            if (record.type === "attributes") {
                sweep(record.target);
            } else {
                record.addedNodes.forEach(sweep);
            }
            return;
        });
        return;
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    return;
}
