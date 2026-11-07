const modifiers = ["Shift", "Control", "Alt", "Meta", "CapsLock"];

export function start() {
    const root = document.documentElement;
    root.classList.add("palatina-pointer");
    document.addEventListener("keydown", (event) => {
        if (!event.metaKey && !event.ctrlKey && !event.altKey && !modifiers.includes(event.key)) {
            root.classList.remove("palatina-pointer");
        }
        return;
    }, { capture: true, passive: true });
    document.addEventListener("pointerdown", () => {
        root.classList.add("palatina-pointer");
        return;
    }, { capture: true, passive: true });
    return;
}
