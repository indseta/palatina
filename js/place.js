const gap = 4;
const edge = 16;
const gutter = 0.033;

export function place(menu, anchor) {
    const rect = anchor.getBoundingClientRect();
    const side = Math.max(edge, window.innerWidth * gutter);
    const below = window.innerHeight - rect.bottom - gap - edge;
    const above = rect.top - gap - edge;
    const height = menu.scrollHeight + menu.offsetHeight - menu.clientHeight;
    const width = menu.offsetWidth;
    const up = height > below && above > below;
    const start = rect.left + rect.width / 2 < window.innerWidth / 2 ? rect.left : rect.right - width;
    menu.style.setProperty("--palatina-menu-left", Math.max(side, Math.min(start, window.innerWidth - side - width)) + "px");
    menu.style.setProperty("--palatina-menu-top", (up ? rect.top - gap - Math.min(height, above) : rect.bottom + gap) + "px");
    menu.style.setProperty("--palatina-menu-height", (up ? above : below) + "px");
    menu.classList.add("palatina-placed");
    return;
}
