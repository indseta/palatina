import { place } from "./place.js";

const triggers = "button, select, [role='button'], [role='combobox']";
const recent = 1000;
const anchors = new WeakMap();
const state = {
    anchor: null,
    time: 0
};

function remember(target) {
    state.anchor = target?.closest?.(triggers) ?? null;
    state.time = performance.now();
    return;
}

function press(event) {
    remember(event.target);
    return;
}

function key(event) {
    if (event.key === "Enter" || event.key === " ") {
        remember(document.activeElement);
    }
    return;
}

function shown(menu) {
    if (document.querySelector("#videoOsdPage:not(.hide)") || getComputedStyle(menu).visibility === "hidden" || menu.getClientRects().length === 0) {
        return false;
    }
    if (menu.classList.contains("actionSheet")) {
        return menu.style.position === "fixed" && !menu.classList.contains("actionsheet-fullscreen");
    }
    return true;
}

function menus() {
    return [...document.querySelectorAll(".MuiPopover-paper, .actionSheet")].filter(shown);
}

function bind() {
    if (!state.anchor?.isConnected || performance.now() - state.time > recent) {
        return;
    }
    menus().filter((menu) => !anchors.has(menu) && !menu.contains(state.anchor)).forEach((menu) => {
        anchors.set(menu, state.anchor);
        place(menu, state.anchor);
        return;
    });
    return;
}

function later() {
    requestAnimationFrame(bind);
    return;
}

function resize() {
    menus().filter((menu) => anchors.get(menu)?.isConnected).forEach((menu) => place(menu, anchors.get(menu)));
    return;
}

export function start() {
    window.addEventListener("pointerdown", press, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("click", later, true);
    window.addEventListener("resize", resize);
    new MutationObserver(bind).observe(document.body, { childList: true });
    return;
}
