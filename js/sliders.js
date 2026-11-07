function follow(event) {
    const range = event.target;
    if (!range.matches?.(".mdl-slider[data-slider-keep-progress='true']")) {
        return;
    }
    const lower = range.parentNode.querySelector(".mdl-slider-background-lower");
    const span = range.max - range.min;
    if (lower && span) {
        lower.style.width = (range.value - range.min) / span * 100 + "%";
    }
    return;
}

export function start() {
    document.addEventListener("input", follow, { capture: true, passive: true });
    return;
}
