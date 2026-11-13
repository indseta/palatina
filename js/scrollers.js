const selector = ".emby-scroller:not([data-horizontal='false'])";
const slack = 20;
const threshold = 3;
const lock = 10;
const pending = new Set();
const watched = new WeakSet();
const dragging = new WeakSet();
const instances = new WeakMap();
const resizer = new ResizeObserver((entries) => {
    entries.forEach((entry) => queue(entry.target));
    return;
});
let scheduled = 0;

function shift(slider) {
    const match = /translate(?:X|3d)?\((-?[\d.]+)px/.exec(slider.style.transform);
    return match ? Math.abs(Number(match[1])) : 0;
}

function offset(slider) {
    const left = Math.abs(slider.scrollLeft);
    const end = slider.scrollWidth - slider.clientWidth;
    const sign = Math.sign(slider.scrollLeft);
    if (end - left < 1) {
        return sign * end;
    }
    return sign * (left < 1 ? 0 : left);
}

function place(slider, item) {
    const side = getComputedStyle(slider).direction === "rtl" ? -1 : 1;
    const outer = slider.getBoundingClientRect();
    const inner = item.getBoundingClientRect();
    const near = side < 0 ? outer.right - inner.right : inner.left - outer.left;
    const visible = slider.clientWidth;
    const start = side * (near + Math.abs(slider.scrollLeft));
    return {
        start: start,
        center: start + side * (inner.width - visible) / 2,
        end: start + side * (inner.width - visible),
        size: inner.width,
        isVisible: near >= 0 && near + inner.width <= visible
    };
}


function hooks(fiber, scroller) {
    for (let hook = fiber.memoizedState; hook?.next !== undefined; hook = hook.next) {
        if (hook.memoizedState?.current?.getScrollFrame?.() === scroller) {
            return hook.memoizedState.current;
        }
    }
    return null;
}

function locate(scroller) {
    if (scroller.scroller) {
        return scroller.scroller;
    }
    const key = Object.keys(scroller).find((name) => name.startsWith("__reactFiber$"));
    for (let fiber = key ? scroller[key] : null; fiber; fiber = fiber.return) {
        const found = hooks(fiber, scroller);
        if (found) {
            return found;
        }
    }
    return null;
}

function sync(scroller) {
    const instance = instances.get(scroller);
    if (!instance?.initialized) {
        return;
    }
    const slider = instance.getScrollSlider();
    instance._pos.cur = offset(slider);
    instance._pos.dest = instance._pos.cur;
    if (instance.getScrollEventName() === "scrollanimate") {
        scroller.dispatchEvent(new CustomEvent("scrollanimate", {
            bubbles: true,
            cancelable: false
        }));
    }
    return;
}

function slide(scroller, position, immediate) {
    instances.get(scroller)?.getScrollSlider().scroll({
        left: position,
        behavior: immediate ? "instant" : "smooth"
    });
    sync(scroller);
    return;
}

function drag(event) {
    const scroller = event.currentTarget;
    const slider = scroller.querySelector(":scope > .scrollSlider");
    if (event.button !== 0 || !slider || !scroller.classList.contains("palatina-scroll-native") || event.target.closest("input, select, textarea")) {
        return;
    }
    event.preventDefault();
    const origin = {
        x: event.pageX,
        y: event.pageY,
        left: slider.scrollLeft
    };
    const state = {
        started: false,
        locked: false
    };
    function block(click) {
        click.preventDefault();
        click.stopPropagation();
        return;
    }
    function finish() {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", move);
        setTimeout(() => window.removeEventListener("click", block, true));
        return;
    }
    function move(next) {
        const x = next.pageX - origin.x;
        const y = next.pageY - origin.y;
        const path = Math.hypot(x, y);
        const released = next.type === "mouseup";
        if (!state.started && (path < threshold || Math.abs(x) <= Math.abs(y))) {
            if (released || path >= threshold) {
                finish();
            }
            return;
        }
        state.started = true;
        if (!state.locked && path > lock) {
            state.locked = true;
            window.addEventListener("click", block, { capture: true, once: true });
        }
        slider.scrollLeft = origin.left - x;
        if (released) {
            finish();
        }
        return;
    }
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseup", move, { passive: true });
    return;
}

function patch(scroller, instance) {
    const slider = instance.getScrollSlider();
    const transform = instance.getScrollEventName() === "scrollanimate";
    const current = instance.getScrollPosition();
    Object.assign(instance.options, {
        scrollBy: 0,
        mouseDragging: 0,
        touchDragging: 0
    });
    Object.assign(instance, {
        slideTo: (position, immediate) => slide(scroller, position, immediate),
        getScrollPosition: () => offset(slider),
        getScrollSize: () => slider.scrollWidth,
        getPos: (item) => place(slider, item)
    });
    ["transform", "transition", "will-change"].forEach((name) => slider.style.removeProperty(name));
    scroller.classList.add("palatina-scroll-native");
    slider.scrollLeft = current;
    if (transform && !dragging.has(scroller)) {
        dragging.add(scroller);
        scroller.addEventListener("mousedown", drag);
    }
    instances.set(scroller, instance);
    sync(scroller);
    return;
}

function native(scroller) {
    if (instances.get(scroller)?.initialized) {
        return;
    }
    const instance = locate(scroller);
    if (instance?.initialized && instance.options?.horizontal && instance.getScrollSlider?.()) {
        patch(scroller, instance);
    }
    return;
}

function measure(scroller) {
    const slider = scroller.querySelector(":scope > .scrollSlider");
    if (!slider || !scroller.isConnected) {
        return;
    }
    native(scroller);
    const visible = slider.clientWidth;
    const size = slider.scrollWidth;
    const position = Math.abs(offset(slider)) + Math.abs(scroller.scrollLeft) + shift(slider);
    const scrolls = size > visible + slack;
    scroller.classList.toggle("palatina-scroll-start", scrolls && position > 0.5);
    scroller.classList.toggle("palatina-scroll-end", scrolls && position + visible < size - 0.5);
    return;
}

function flush() {
    scheduled = 0;
    pending.forEach(measure);
    pending.clear();
    return;
}

function queue(scroller) {
    if (!watched.has(scroller)) {
        watched.add(scroller);
        resizer.observe(scroller);
    }
    pending.add(scroller);
    if (!scheduled) {
        scheduled = requestAnimationFrame(flush);
    }
    return;
}

function owner(node) {
    const scroller = node.closest?.(selector);
    if (scroller) {
        queue(scroller);
    }
    return;
}

function sweep(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    owner(node);
    node.querySelectorAll(selector).forEach(queue);
    return;
}

function moved(event) {
    if (event.type === "scroll" && event.target.matches?.(".palatina-scroll-native > .scrollSlider")) {
        sync(event.target.parentElement);
    }
    if (event.type !== "transitionend" || event.propertyName === "transform") {
        owner(event.target);
    }
    return;
}

export function start() {
    sweep(document.body);
    const observer = new MutationObserver((records) => {
        records.forEach((record) => {
            owner(record.target);
            record.addedNodes.forEach(sweep);
            return;
        });
        return;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    ["scroll", "scrollanimate", "transitionend"].forEach((type) => document.addEventListener(type, moved, { capture: true, passive: true }));
    return;
}
