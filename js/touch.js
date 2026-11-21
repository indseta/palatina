function press() {
    return;
}

export function start() {
    document.addEventListener("touchstart", press, { passive: true });
    return;
}
