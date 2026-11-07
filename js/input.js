const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const widgets = "[role='menu'], [role='menubar'], [role='listbox'], [role='tablist'], [role='radiogroup'], [role='tree'], [role='grid']";

function navigates(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
        return false;
    }
    if (event.key === "Tab") {
        return true;
    }
    return arrows.includes(event.key) && (document.documentElement.classList.contains("layout-tv") || Boolean(event.target.closest?.(widgets)));
}

export function start() {
    const root = document.documentElement;
    root.classList.add("palatina-pointer");
    document.addEventListener("keydown", (event) => {
        if (navigates(event)) {
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
