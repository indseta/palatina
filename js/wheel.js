function block(event) {
    if (document.querySelector("#videoOsdPage:not(.hide)")) {
        event.stopImmediatePropagation();
    }
    return;
}

export function start() {
    window.addEventListener("wheel", block, { capture: true, passive: true });
    return;
}
