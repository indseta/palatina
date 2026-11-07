const labelled = new WeakSet();

function strip(element) {
    const title = element.getAttribute("title");
    if (title === null) {
        return;
    }
    if ((!element.hasAttribute("aria-label") || labelled.has(element)) && !element.textContent.trim()) {
        element.setAttribute("aria-label", title);
        labelled.add(element);
    }
    element.removeAttribute("title");
    return;
}

function sweep(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    strip(node);
    node.querySelectorAll("[title]").forEach(strip);
    return;
}

export function start() {
    sweep(document.body);
    const observer = new MutationObserver((records) => {
        records.forEach((record) => {
            if (record.type === "attributes") {
                strip(record.target);
            } else {
                record.addedNodes.forEach(sweep);
            }
            return;
        });
        return;
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
    return;
}
