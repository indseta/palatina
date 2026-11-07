const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let keyboardTimer = 0;

function part(range, name) {
    return range.parentNode.querySelector(name);
}

function rtl(range) {
    return getComputedStyle(range).direction === "rtl";
}

function step(range, value) {
    if (value > 0) {
        return value;
    }
    const parsed = parseFloat(range.step);
    return parsed > 0 ? parsed : 1;
}

function decimals(value) {
    const text = String(value);
    return text.includes(".") ? text.split(".")[1].length : 0;
}

function clientFraction(range, x) {
    const rect = part(range, ".sliderBubbleTrack").getBoundingClientRect();
    const raw = rtl(range) ? (rect.right - x) / rect.width : (x - rect.left) / rect.width;
    const span = range.max - range.min;
    const size = span !== 0 ? step(range) / span : 0;
    const snapped = size ? Math.round(raw / size) * size : raw;
    return Math.min(Math.max(snapped, 0), 1);
}

function fractionValue(range, fraction) {
    const min = parseFloat(range.min);
    const size = step(range);
    const value = Math.round((range.max - range.min) * fraction / size) * size + min;
    const fixed = parseFloat(value.toFixed(Math.max(decimals(size), decimals(min))));
    return Math.min(Math.max(fixed, min), parseFloat(range.max));
}

function valueFraction(range, value) {
    const span = range.max - range.min;
    return span !== 0 ? Math.min(Math.max((value - range.min) / span, 0), 1) : 0;
}

function fill(range) {
    const value = range.value;
    cancelAnimationFrame(range.fillFrame);
    range.fillFrame = requestAnimationFrame(() => {
        const lower = part(range, ".mdl-slider-background-lower");
        if (lower) {
            lower.style.width = (value - range.min) / (range.max - range.min) * 100 + "%";
        }
        return;
    });
    return;
}

function showBubble(range, percent, value) {
    const bubble = part(range, ".sliderBubble");
    if (!bubble) {
        return;
    }
    requestAnimationFrame(() => {
        const track = part(range, ".sliderBubbleTrack").getBoundingClientRect();
        const box = bubble.getBoundingClientRect();
        const raw = track.width * percent / 100;
        const position = rtl(range) ? track.width - raw : raw;
        bubble.style.left = Math.min(Math.max(position, box.width / 2), track.width - box.width / 2) + "px";
        bubble.innerHTML = range.getBubbleHtml ? range.getBubbleHtml(percent, value) : "<h1 class=\"sliderBubbleText\">" + value.toLocaleString() + "</h1>";
        return;
    });
    bubble.classList.remove("hide");
    return;
}

function hideBubble(range) {
    part(range, ".sliderBubble")?.classList.add("hide");
    return;
}

function emit(range, type) {
    range.dispatchEvent(new Event(type, { bubbles: true, cancelable: false }));
    return;
}

function finishKeyboard(range) {
    clearTimeout(keyboardTimer);
    keyboardTimer = 0;
    range.keyboardDragging = false;
    emit(range, "change");
    return;
}

function stepKeyboard(range, delta) {
    range.keyboardDragging = true;
    clearTimeout(keyboardTimer);
    keyboardTimer = setTimeout(() => finishKeyboard(range), 1000);
    range.value = parseFloat(range.value) + delta;
    emit(range, "input");
    return;
}

function keyboard(event) {
    const range = event.currentTarget;
    if (event.key === "ArrowLeft" || event.key === "Left") {
        stepKeyboard(range, -step(range, range.keyboardStepDown));
        event.preventDefault();
        event.stopPropagation();
    } else if (event.key === "ArrowRight" || event.key === "Right") {
        stepKeyboard(range, step(range, range.keyboardStepUp));
        event.preventDefault();
        event.stopPropagation();
    } else if (event.key === "Enter" && range.keyboardDragging) {
        finishKeyboard(range);
        event.preventDefault();
        event.stopPropagation();
    }
    return;
}

function touch(range) {
    range.addEventListener("touchstart", (event) => {
        if (event.targetTouches.length !== 1) {
            return;
        }
        range.touched = true;
        range.value = fractionValue(range, clientFraction(range, event.targetTouches[0].clientX));
        emit(range, "input");
        event.preventDefault();
        return;
    }, { capture: true });
    range.addEventListener("touchmove", (event) => {
        if (range.touched && event.targetTouches.length === 1) {
            range.value = fractionValue(range, clientFraction(range, event.targetTouches[0].clientX));
            emit(range, "input");
        }
        return;
    }, { passive: true });
    range.addEventListener("touchend", () => {
        setTimeout(() => {
            range.touched = false;
            emit(range, "change");
            return;
        }, 0);
        return;
    }, { passive: true });
    return;
}

export function bindSlider(range) {
    const keep = range.dataset.sliderKeepProgress === "true";
    range.addEventListener("input", () => {
        range.dragging = true;
        if (!keep) {
            fill(range);
        }
        showBubble(range, valueFraction(range, range.value) * 100, parseFloat(range.value));
        return;
    }, { passive: true });
    range.addEventListener("change", () => {
        range.dragging = false;
        if (keep) {
            fill(range);
        }
        hideBubble(range);
        return;
    }, { passive: true });
    range.addEventListener("pointermove", (event) => {
        if (!range.dragging) {
            const fraction = clientFraction(range, event.clientX);
            showBubble(range, fraction * 100, fractionValue(range, fraction));
        }
        return;
    }, { passive: true });
    range.addEventListener("pointerleave", () => hideBubble(range), { passive: true });
    if (ios) {
        touch(range);
    }
    return;
}

export function bindSliders(root) {
    root.querySelectorAll("input.mdl-slider").forEach(bindSlider);
    return;
}

export function enableKeyboardDragging(range, down, up) {
    range.keyboardStepDown = down || up || 1;
    range.keyboardStepUp = up || down || 1;
    range.addEventListener("keydown", keyboard);
    return;
}

export function setSliderValue(range, value) {
    range.value = value;
    if (!range.keyboardDragging && !range.touched) {
        fill(range);
    }
    return;
}

export function setBufferedRanges(range, ranges, position) {
    const upper = part(range, ".mdl-slider-background-upper");
    if (!upper) {
        return;
    }
    const found = ranges.find((item) => position === null || position < item.end) ?? { start: 0, end: 0 };
    upper.style[rtl(range) ? "right" : "left"] = Math.max(found.start, 0) + "%";
    upper.style.width = Math.max(Math.min(found.end - found.start, 100), 0) + "%";
    return;
}
