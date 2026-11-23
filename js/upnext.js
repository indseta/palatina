import { onView } from "./router.js";

const hidden = "upNextDialog-hidden";
const wait = 1000;
const watched = new WeakSet();
const timers = new WeakMap();

function finish(panel) {
    timers.delete(panel);
    if (panel.isConnected && panel.classList.contains(hidden)) {
        panel.dispatchEvent(new TransitionEvent("transitionend", { bubbles: true, propertyName: "opacity" }));
    }
    return;
}

function fading(record) {
    const panel = record.target;
    if (!panel.classList.contains(hidden) || (record.oldValue ?? "").split(" ").includes(hidden)) {
        return;
    }
    clearTimeout(timers.get(panel));
    timers.set(panel, setTimeout(() => finish(panel), wait));
    return;
}

function watch(view) {
    const panel = view.querySelector(".upNextContainer");
    if (!panel || watched.has(panel)) {
        return;
    }
    watched.add(panel);
    new MutationObserver((records) => records.forEach(fading)).observe(panel, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    return;
}

export function start() {
    onView("videoOsdPage", watch);
    return;
}
