import { place } from "./place.js";

const selector = "select.emby-select:not([multiple])";
const state = {
    menu: null,
    select: null
};

function close() {
    state.menu?.remove();
    state.menu = null;
    state.select = null;
    return;
}

function choose(select, value) {
    close();
    if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: false, cancelable: true }));
    }
    return;
}

function item(select, option) {
    const row = document.createElement("div");
    row.className = "palatina-menu-item";
    row.classList.toggle("palatina-menu-item-selected", option.selected);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(option.selected));
    row.textContent = option.textContent;
    row.addEventListener("click", () => choose(select, option.value));
    return row;
}

function themed() {
    return getComputedStyle(document.documentElement).getPropertyValue("--palatina-radius") !== "";
}

function open(select) {
    close();
    const menu = document.createElement("div");
    menu.className = "palatina-menu";
    menu.setAttribute("role", "listbox");
    menu.append(...[...select.options].filter((option) => !option.hidden && !option.disabled).map((option) => item(select, option)));
    menu.style.minWidth = select.getBoundingClientRect().width + "px";
    document.body.append(menu);
    place(menu, select);
    state.menu = menu;
    state.select = select;
    return;
}

function press(event) {
    const select = event.target.closest?.(selector);
    if (select && !select.disabled && event.button === 0 && themed()) {
        event.preventDefault();
        select.focus();
        if (state.select === select) {
            close();
        } else {
            open(select);
        }
        return;
    }
    if (state.menu && !state.menu.contains(event.target)) {
        close();
    }
    return;
}

function scroll(event) {
    if (state.menu && !state.menu.contains(event.target)) {
        close();
    }
    return;
}

function key(event) {
    if (state.menu && event.key === "Escape") {
        close();
    }
    return;
}

export function start() {
    document.addEventListener("mousedown", press, true);
    document.addEventListener("scroll", scroll, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("viewshow", close);
    window.addEventListener("resize", close);
    return;
}
