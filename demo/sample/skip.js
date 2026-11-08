const segment = {
    start: 0,
    end: 10,
    type: "Intro"
};

export function startSkip(video, seek) {
    const state = {
        element: null,
        current: null,
        hideTimeout: 0,
        inside: false,
        onHide: null
    };

    function clearHideTimeout() {
        if (state.hideTimeout) {
            clearTimeout(state.hideTimeout);
            state.hideTimeout = 0;
        }
        return;
    }

    function clearHideListener() {
        if (state.onHide) {
            state.element.removeEventListener("transitionend", state.onHide);
            state.onHide = null;
        }
        return;
    }

    function hideComplete() {
        const element = state.element;
        if (document.activeElement === element) {
            element.blur();
            document.querySelector(".btnPause")?.focus();
        }
        element.classList.add("hide");
        state.onHide = null;
        return;
    }

    function create() {
        if (state.element || !state.current) {
            return;
        }
        document.body.insertAdjacentHTML("beforeend", "<div class=\"skip-button-container\"><button is=\"emby-button\" class=\"skip-button hide skip-button-hidden emby-button\"></button></div>");
        state.element = document.body.querySelector(".skip-button");
        state.element.addEventListener("click", () => {
            if (state.current && video.currentTime < state.current.end - 1) {
                seek(state.current.end);
            } else {
                hide();
            }
            return;
        });
        return;
    }

    function setText() {
        if (state.element && state.current) {
            state.element.innerHTML = "Skip " + state.current.type + "<span class=\"material-icons skip_next\" aria-hidden=\"true\"></span>";
        }
        return;
    }

    function show(options) {
        const element = state.element;
        if (!element) {
            return;
        }
        clearHideTimeout();
        clearHideListener();
        element.classList.remove("hide");
        element.classList.toggle("no-transition", !options.animate);
        void element.offsetWidth;
        requestAnimationFrame(() => {
            element.classList.remove("skip-button-hidden");
            if (!options.keep) {
                state.hideTimeout = setTimeout(hide, 8000);
            }
            return;
        });
        return;
    }

    function hide() {
        const element = state.element;
        if (!element) {
            return;
        }
        element.classList.remove("no-transition");
        void element.offsetWidth;
        requestAnimationFrame(() => {
            element.classList.add("skip-button-hidden");
            clearHideListener();
            state.onHide = hideComplete;
            element.addEventListener("transitionend", hideComplete, { once: true });
            return;
        });
        return;
    }

    function osd(open) {
        if (!state.current) {
            return;
        }
        if (open) {
            show({
                animate: false,
                keep: true
            });
        } else if (!state.hideTimeout) {
            hide();
        }
        return;
    }

    function update() {
        const time = video.currentTime;
        const inside = time >= segment.start && time < segment.end;
        if (inside && !state.inside && !state.current) {
            state.current = segment;
            create();
            setText();
            show({
                animate: true,
                keep: false
            });
        }
        state.inside = inside;
        if (state.current && !inside) {
            state.current = null;
            hide();
        }
        return;
    }

    function stop() {
        clearHideTimeout();
        state.element?.parentElement?.remove();
        return;
    }

    return {
        osd: osd,
        update: update,
        stop: stop
    };
}
