const speed = 270;
const immediateSpeed = 50;
const dragThreshold = 3;

function within(value, first, second) {
    return Math.min(Math.max(value, Math.min(first, second)), Math.max(first, second));
}

function rtl(element) {
    return getComputedStyle(element).direction === "rtl";
}

function styleValue(style, name) {
    return parseInt(style.getPropertyValue(name).replace("px", ""), 10) || 0;
}

function visibleSize(frame) {
    const outer = getComputedStyle(frame);
    const inner = getComputedStyle(frame.getScrollSlider());
    return frame.offsetWidth - styleValue(outer, "padding-left") - styleValue(outer, "padding-right") - styleValue(inner, "padding-left") - styleValue(inner, "padding-right");
}

function createScroller(frame, slider) {
    const options = {
        horizontal: true,
        mouseWheel: true,
        scrollBy: 200,
        mouseDragging: 1,
        touchDragging: 1,
        speed: speed,
        autoImmediate: true,
        dispatchScrollEvent: true
    };
    const pos = {
        start: 0,
        center: 0,
        end: 0,
        cur: 0,
        dest: 0
    };
    const sizes = {
        frame: 0,
        slidee: 0
    };
    const dragging = {
        init: false,
        locked: false,
        touch: false,
        x: 0,
        y: 0,
        from: 0
    };
    const timing = {
        last: 0
    };
    const instance = {
        options: options,
        _pos: pos,
        initialized: 0,
        slidee: slider
    };

    function measure() {
        sizes.frame = slider.clientWidth;
        sizes.slidee = Math.max(slider.offsetWidth, slider.scrollWidth);
        pos.end = Math.max(sizes.slidee - sizes.frame, 0) * (rtl(frame) ? -1 : 1);
        return;
    }

    function wheel(event) {
        measure();
        if (!options.scrollBy || pos.start === pos.end) {
            return;
        }
        const delta = event.deltaX / (event.deltaMode === 1 ? 3 : 100);
        const next = pos.dest + options.scrollBy * delta;
        if (event.deltaX !== 0 && event.deltaY >= -5 && event.deltaY <= 5 && next > 0 && next < pos.end) {
            event.preventDefault();
        }
        instance.slideBy(options.scrollBy * delta);
        return;
    }

    function block(event) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    function point(event, released) {
        return dragging.touch ? event[released ? "changedTouches" : "touches"][0] : event;
    }

    function end() {
        ["mousemove", "mouseup", "touchmove", "touchend"].forEach((type) => document.removeEventListener(type, move));
        setTimeout(() => window.removeEventListener("click", block, true));
        dragging.init = false;
        return;
    }

    function move(event) {
        const released = event.type === "mouseup" || event.type === "touchend";
        const pointer = point(event, released);
        const pathX = pointer.pageX - dragging.x;
        const pathY = pointer.pageY - dragging.y;
        const path = Math.hypot(pathX, pathY);
        if (!released && path < 1) {
            return;
        }
        if (!dragging.init) {
            if (path < dragThreshold) {
                if (released) {
                    end();
                }
                return;
            }
            if (Math.abs(pathX) <= Math.abs(pathY)) {
                end();
                return;
            }
            dragging.init = true;
        }
        if (!dragging.locked && path > (dragging.touch ? 30 : 10)) {
            dragging.locked = true;
            window.addEventListener("click", block, { capture: true, once: true });
        }
        if (released) {
            end();
        }
        instance.slideTo(Math.round(dragging.from - pathX));
        return;
    }

    function start(event) {
        const touch = event.type === "touchstart";
        if (dragging.init || (!touch && event.target.closest("input, select, textarea"))) {
            return;
        }
        if (!(touch ? options.touchDragging : options.mouseDragging && event.button < 1)) {
            return;
        }
        if (!touch) {
            event.preventDefault();
        }
        dragging.touch = touch;
        const pointer = point(event, false);
        dragging.locked = false;
        dragging.x = pointer.pageX;
        dragging.y = pointer.pageY;
        dragging.from = pos.cur;
        (touch ? ["touchmove", "touchend"] : ["mousemove", "mouseup"]).forEach((type) => document.addEventListener(type, move, { passive: true }));
        return;
    }

    instance.slideTo = (target, immediate) => {
        measure();
        const position = within(target, pos.start, pos.end);
        const now = Date.now();
        const instant = immediate || dragging.init || (options.autoImmediate && now - timing.last <= 50);
        pos.dest = position;
        slider.style.transition = "transform " + (instant ? immediateSpeed : options.speed) + "ms ease-out";
        slider.style.transform = "translateX(" + -Math.round(position) + "px)";
        pos.cur = position;
        frame.dispatchEvent(new CustomEvent("scrollanimate", { bubbles: true, cancelable: false }));
        timing.last = now;
        return;
    };
    instance.slideBy = (delta, immediate) => {
        if (delta) {
            instance.slideTo(pos.dest + delta, immediate);
        }
        return;
    };
    instance.reload = () => {
        measure();
        instance.slideTo(within(pos.dest, pos.start, pos.end));
        return;
    };
    instance.getScrollPosition = () => pos.cur;
    instance.getScrollSize = () => sizes.slidee;
    instance.getScrollSlider = () => slider;
    instance.getScrollFrame = () => frame;
    instance.getScrollEventName = () => "scrollanimate";
    instance.destroy = () => {
        frame.removeEventListener("wheel", wheel);
        frame.removeEventListener("mousedown", start);
        frame.removeEventListener("touchstart", start);
        instance.initialized = 0;
        return instance;
    };
    instance.init = () => {
        slider.style.willChange = "transform";
        slider.style.transition = "transform " + options.speed + "ms ease-out";
        frame.addEventListener("mousedown", start);
        frame.addEventListener("touchstart", start, { passive: true });
        frame.addEventListener("wheel", wheel, { passive: false });
        instance.initialized = 1;
        measure();
        return instance;
    };
    return instance;
}

function step(frame, direction) {
    const items = [...frame.getScrollSlider().children];
    if (!items.length) {
        return;
    }
    const modifier = rtl(frame) ? -1 : 1;
    const current = frame.getScrollPosition() * modifier;
    const width = frame.offsetWidth;
    const itemWidth = items[0].offsetWidth;
    const first = Math.max(Math.floor(current / itemWidth) - 1, 0);
    const last = Math.floor((current + width) / itemWidth);
    if (direction === "right") {
        const next = items[last] || items[last - 1];
        frame.scrollToPosition(last * next.offsetWidth * modifier);
    } else {
        const previous = items[first];
        const adjust = (Math.floor(width / previous.offsetWidth) - 1) * previous.offsetWidth;
        frame.scrollToPosition((first * previous.offsetWidth - adjust) * modifier);
    }
    return;
}

function bindButtons(frame) {
    const holder = frame.previousElementSibling;
    const buttons = holder?.classList.contains("emby-scrollbuttons") ? [...holder.querySelectorAll(".emby-scrollbuttons-button")] : [];
    if (buttons.length !== 2) {
        return;
    }
    function update() {
        const size = visibleSize(frame);
        const position = frame.getScrollPosition() * (rtl(holder) ? -1 : 1);
        const width = frame.getScrollSize();
        buttons.forEach((button) => button.classList.toggle("hide", width <= size + 20));
        buttons[0].disabled = !(position > 0);
        buttons[1].disabled = width > 0 && position + size >= width;
        return;
    }
    buttons.forEach((button) => button.addEventListener("click", () => step(frame, button.getAttribute("data-direction"))));
    frame.addEventListener(frame.scroller.getScrollEventName(), update, { passive: true });
    requestAnimationFrame(update);
    return;
}

function bindScroller(frame, resizer) {
    const slider = frame.querySelector(":scope > .scrollSlider");
    if (!slider) {
        return;
    }
    Object.assign(frame, {
        scrollToPosition: (position, immediate) => frame.scroller?.slideTo(position, immediate),
        getScrollPosition: () => frame.scroller?.getScrollPosition(),
        getScrollSize: () => frame.scroller?.getScrollSize(),
        getScrollSlider: () => frame.scroller?.getScrollSlider()
    });
    frame.scroller = createScroller(frame, slider);
    frame.scroller.init();
    frame.scroller.reload();
    bindButtons(frame);
    resizer.observe(frame);
    return;
}

export function bindScrollers(root) {
    const frames = [...root.querySelectorAll(".emby-scroller:not([data-horizontal='false'])")];
    const resizer = new ResizeObserver((entries) => {
        entries.forEach((entry) => entry.target.scroller?.reload());
        return;
    });
    frames.forEach((frame) => bindScroller(frame, resizer));
    return () => {
        resizer.disconnect();
        frames.forEach((frame) => frame.scroller?.destroy());
        return null;
    };
}
