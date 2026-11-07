const selector = "input.mdl-slider";

function decimals(value) {
    const text = String(value);
    return text.includes(".") ? text.split(".")[1].length : 0;
}

function emit(range, type) {
    range.dispatchEvent(new Event(type, { bubbles: true }));
    return;
}

function valueAt(range, x) {
    const rect = (range.parentNode.querySelector(".sliderBubbleTrack") ?? range).getBoundingClientRect();
    const min = parseFloat(range.min || "0");
    const max = parseFloat(range.max || "100");
    const step = parseFloat(range.step) > 0 ? parseFloat(range.step) : 1;
    const raw = getComputedStyle(range).direction === "rtl" ? (rect.right - x) / rect.width : (x - rect.left) / rect.width;
    const fraction = rect.width ? Math.min(Math.max(raw, 0), 1) : 0;
    const value = parseFloat((Math.round((max - min) * fraction / step) * step + min).toFixed(Math.max(decimals(step), decimals(min))));
    return Math.min(Math.max(value, min), max);
}

function move(range, x) {
    const before = range.value;
    range.value = valueAt(range, x);
    if (range.value !== before) {
        emit(range, "input");
    }
    return;
}

function fill(range) {
    const lower = range.parentNode.querySelector(".mdl-slider-background-lower");
    const span = range.max - range.min;
    if (lower && span) {
        lower.style.width = (range.value - range.min) / span * 100 + "%";
    }
    return;
}

function follow(event) {
    if (event.target.matches?.(selector + "[data-slider-keep-progress='true']")) {
        fill(event.target);
    }
    return;
}

function drag(event) {
    const range = event.target.closest?.(selector);
    if (!range || range.disabled || event.button !== 0 || event.pointerType === "touch") {
        return;
    }
    const id = event.pointerId;
    const moved = (next) => (next.pointerId === id ? move(range, next.clientX) : null);
    const done = (next) => {
        if (next.pointerId !== id) {
            return;
        }
        range.removeEventListener("pointermove", moved);
        range.removeEventListener("pointerup", done);
        range.removeEventListener("pointercancel", done);
        emit(range, "change");
        return;
    };
    range.setPointerCapture(id);
    range.focus({ preventScroll: true });
    range.addEventListener("pointermove", moved);
    range.addEventListener("pointerup", done);
    range.addEventListener("pointercancel", done);
    move(range, event.clientX);
    return;
}

function block(event) {
    if (event.button === 0 && event.target.closest?.(selector)) {
        event.preventDefault();
    }
    return;
}

export function start() {
    document.addEventListener("input", follow, { capture: true, passive: true });
    document.addEventListener("pointerdown", drag, { capture: true });
    document.addEventListener("mousedown", block, { capture: true });
    return;
}
