import { enableKeyboardDragging, setBufferedRanges, setSliderValue } from "./slider.js";

const skipBack = 10;
const skipForward = 30;

function runningTime(seconds) {
    const total = Math.max(Math.floor(seconds), 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const parts = hours ? [String(hours), String(minutes).padStart(2, "0")] : [String(minutes)];
    parts.push(String(total % 60).padStart(2, "0"));
    return parts.join(":");
}

function setIcon(button, remove, add) {
    const icon = button.querySelector(".material-icons");
    icon.classList.remove(...remove);
    icon.classList.add(add);
    return;
}

function focusable(element) {
    return element && element !== document.body && element.matches("button, input, a[href], [tabindex]") && !element.disabled && element.checkVisibility();
}

function openedDialog() {
    return document.querySelector(".dialogContainer .dialog.opened, .MuiPopover-root, .MuiDialog-root");
}

function fullscreenElement() {
    return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
}

export function startPlayer(back) {
    const view = document.querySelector("#videoOsdPage");
    const video = document.querySelector("video");
    if (!view || !video) {
        return () => null;
    }
    const bottom = view.querySelector(".videoOsdBottom-maincontrols");
    const header = document.querySelector(".skinHeader");
    const appHeader = document.querySelector(".skinHeader.MuiBox-root");
    const position = view.querySelector(".osdPositionSlider");
    const volume = view.querySelector(".osdVolumeSlider");
    const positionText = view.querySelector(".osdPositionText");
    const durationText = view.querySelector(".osdDurationText");
    const endsAt = view.querySelector(".endsAtText");
    const pause = view.querySelector(".btnPause");
    const rewindButton = view.querySelector(".btnRewind");
    const forwardButton = view.querySelector(".btnFastForward");
    const mute = view.querySelector(".buttonMute");
    const fullscreen = view.querySelector(".btnFullscreen");
    const cleanup = [];
    const ending = new Map();
    const timers = { hide: 0, click: 0, fade: 0 };
    const state = { visible: true, mouseDown: false, lastMove: null, lastTouch: 0 };

    function listen(target, type, handler, settings) {
        target.addEventListener(type, handler, settings);
        cleanup.push(() => target.removeEventListener(type, handler, settings));
        return;
    }

    function clearEnd(element) {
        const handler = ending.get(element);
        if (handler) {
            element.removeEventListener("transitionend", handler);
            ending.delete(element);
        }
        return;
    }

    function hideAfterTransition(element) {
        clearEnd(element);
        const handler = (event) => {
            if (event.target === element) {
                element.classList.add("hide");
                clearEnd(element);
            }
            return;
        };
        ending.set(element, handler);
        element.addEventListener("transitionend", handler);
        return;
    }

    function fade(shown) {
        if (!appHeader) {
            return;
        }
        clearTimeout(timers.fade);
        if (shown) {
            appHeader.style.opacity = "1";
            appHeader.style.removeProperty("visibility");
        } else {
            appHeader.style.opacity = "0";
            timers.fade = setTimeout(() => {
                appHeader.style.visibility = "hidden";
                return;
            }, 195);
        }
        return;
    }

    function focusOn(target) {
        const current = target ?? document.activeElement;
        const element = focusable(current) ? target : pause;
        element?.focus();
        return;
    }

    function stopHideTimer() {
        clearTimeout(timers.hide);
        timers.hide = 0;
        return;
    }

    function resetIdle() {
        stopHideTimer();
        if (state.visible && !state.mouseDown && !openedDialog()) {
            timers.hide = setTimeout(hideOsd, 3000);
        }
        return;
    }

    function showOsd(target) {
        fade(true);
        if (header) {
            clearEnd(header);
            header.classList.remove("hide", "osdHeader-hidden");
        }
        if (!state.visible) {
            state.visible = true;
            clearEnd(bottom);
            bottom.classList.remove("hide", "videoOsdBottom-hidden");
        }
        focusOn(target);
        resetIdle();
        return;
    }

    function hideOsd() {
        fade(false);
        if (header) {
            header.classList.add("osdHeader-hidden");
            hideAfterTransition(header);
        }
        if (state.visible) {
            bottom.classList.add("videoOsdBottom-hidden");
            hideAfterTransition(bottom);
            state.visible = false;
            if (bottom.contains(document.activeElement) || header?.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        }
        document.body.classList.add("mouseIdle");
        return;
    }

    function toggleOsd() {
        if (state.visible) {
            hideOsd();
        } else {
            showOsd();
        }
        return;
    }

    function duration() {
        return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    }

    function seek(seconds) {
        video.currentTime = Math.min(Math.max(seconds, 0), duration());
        return;
    }

    function playPause() {
        if (video.paused) {
            video.play().catch(() => null);
        } else {
            video.pause();
        }
        return;
    }

    function getVolume() {
        return Math.min(Math.round(Math.pow(video.volume, 1 / 3) * 100), 100);
    }

    function setVolume(value) {
        video.volume = Math.pow(value / 100, 3);
        return;
    }

    function toggleFullscreen() {
        const root = document.documentElement;
        if (fullscreenElement()) {
            (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
        } else if (root.requestFullscreen ?? root.webkitRequestFullscreen) {
            Promise.resolve((root.requestFullscreen ?? root.webkitRequestFullscreen).call(root)).catch(() => null);
        } else {
            video.webkitEnterFullscreen?.();
        }
        return;
    }

    function togglePictureInPicture() {
        if (document.pictureInPictureEnabled) {
            const action = document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture();
            action.catch(() => null);
        } else if (video.webkitSupportsPresentationMode?.("picture-in-picture")) {
            video.webkitSetPresentationMode(video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
        }
        return;
    }

    function updatePlayPause() {
        const title = video.paused ? "Play" : "Pause";
        setIcon(pause, ["play_arrow", "pause"], video.paused ? "play_arrow" : "pause");
        pause.setAttribute("title", title + " (K)");
        pause.setAttribute("aria-label", title);
        return;
    }

    function updateTime() {
        const total = duration();
        if (!total) {
            return;
        }
        const current = video.currentTime;
        const percent = current / total * 100;
        if (!position.dragging) {
            setSliderValue(position, percent);
            const end = new Date(Date.now() + (total - current) * 1000 / (video.playbackRate || 1));
            endsAt.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;Ends at " + end.toLocaleTimeString(document.documentElement.lang || "en-US", { hour: "numeric", minute: "2-digit" });
        }
        const ranges = Array.from({ length: video.buffered.length }, (_, index) => ({ start: video.buffered.start(index) / total * 100, end: video.buffered.end(index) / total * 100 }));
        setBufferedRanges(position, ranges, percent);
        positionText.textContent = runningTime(current);
        positionText.classList.remove("hide");
        durationText.textContent = "-" + runningTime(total - current);
        durationText.classList.remove("hide");
        return;
    }

    function updateVolume() {
        const title = video.muted ? "Unmute" : "Mute";
        setIcon(mute, ["volume_off", "volume_up"], video.muted ? "volume_off" : "volume_up");
        mute.setAttribute("title", title + " (M)");
        if (!volume.dragging) {
            setSliderValue(volume, getVolume());
        }
        return;
    }

    function updateFullscreen() {
        const active = Boolean(fullscreenElement());
        setIcon(fullscreen, ["fullscreen_exit", "fullscreen"], active ? "fullscreen_exit" : "fullscreen");
        fullscreen.setAttribute("title", (active ? "Exit full screen" : "Full screen") + " (F)");
        return;
    }

    function keydown(event) {
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }
        const key = event.code;
        if (event.keyCode === 32) {
            playPause();
            showOsd(pause);
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const digit = /^(?:Digit|Numpad)(\d)$/.exec(key);
        if (digit) {
            seek(duration() * Number(digit[1]) / 10);
            return;
        }
        if (event.shiftKey && key !== "Escape" && key !== "Enter") {
            return;
        }
        if (key === "Enter" || key === "NumpadEnter") {
            showOsd();
        } else if (key === "Escape") {
            if (state.visible && !openedDialog()) {
                hideOsd();
                event.stopPropagation();
            }
        } else if (key === "KeyK") {
            event.preventDefault();
            playPause();
            showOsd(pause);
        } else if (key === "ArrowUp" || key === "ArrowDown") {
            event.preventDefault();
            setVolume(key === "ArrowUp" ? Math.min(getVolume() + 2, 100) : Math.max(getVolume() - 2, 0));
        } else if (key === "KeyL" || key === "ArrowRight") {
            event.preventDefault();
            seek(video.currentTime + skipForward);
            showOsd(forwardButton);
        } else if (key === "KeyJ" || key === "ArrowLeft") {
            event.preventDefault();
            seek(video.currentTime - skipBack);
            showOsd(rewindButton);
        } else if (key === "KeyF") {
            event.preventDefault();
            toggleFullscreen();
        } else if (key === "KeyM") {
            event.preventDefault();
            video.muted = !video.muted;
        } else if (key === "Home" || key === "End") {
            event.preventDefault();
            seek(key === "Home" ? 0 : duration());
        }
        return;
    }

    function pointerMove(event) {
        if ((event.pointerType || "mouse") !== "mouse") {
            return;
        }
        const x = event.screenX || event.clientX || 0;
        const y = event.screenY || event.clientY || 0;
        if (!state.lastMove) {
            state.lastMove = { x: x, y: y };
            return;
        }
        if (Math.abs(x - state.lastMove.x) < 10 && Math.abs(y - state.lastMove.y) < 10) {
            return;
        }
        state.lastMove = { x: x, y: y };
        document.body.classList.remove("mouseIdle");
        showOsd();
        return;
    }

    function viewPointerDown(event) {
        if (event.target.closest(".videoOsdBottom, .upNextContainer")) {
            showOsd();
            return;
        }
        const type = event.pointerType || "mouse";
        if (type === "touch") {
            if (Date.now() - state.lastTouch > 300) {
                state.lastTouch = Date.now();
                toggleOsd();
            }
        } else if (type === "mouse") {
            if (!event.button) {
                if (timers.click) {
                    clearTimeout(timers.click);
                    timers.click = 0;
                } else {
                    timers.click = setTimeout(() => {
                        playPause();
                        showOsd();
                        timers.click = 0;
                        return;
                    }, 300);
                }
            }
        } else {
            playPause();
            showOsd();
        }
        return;
    }

    function mouseState(down) {
        return () => {
            state.mouseDown = down;
            resetIdle();
            return;
        };
    }

    position.getBubbleHtml = (percent) => (duration() ? "<h1 class=\"sliderBubbleText\">" + runningTime(duration() * percent / 100) + "</h1>" : "--:--");
    position.updateBubbleHtml = () => {
        showOsd();
        return false;
    };
    if (duration()) {
        enableKeyboardDragging(position, skipBack / duration() * 100, skipForward / duration() * 100);
    } else {
        video.addEventListener("loadedmetadata", () => enableKeyboardDragging(position, skipBack / duration() * 100, skipForward / duration() * 100), { once: true });
    }
    listen(video, "play", updatePlayPause);
    listen(video, "pause", updatePlayPause);
    listen(video, "timeupdate", updateTime);
    listen(video, "progress", updateTime);
    listen(video, "volumechange", updateVolume);
    listen(video, "ended", back);
    listen(document, "fullscreenchange", updateFullscreen);
    listen(document, "webkitfullscreenchange", updateFullscreen);
    listen(document, "keydown", keydown);
    listen(document, "keydown", resetIdle, { capture: true, passive: true });
    listen(document, "pointermove", pointerMove, { passive: true });
    listen(window, "pointerdown", mouseState(true), { capture: true, passive: true });
    listen(window, "pointerup", mouseState(false), { capture: true, passive: true });
    listen(window, "touchstart", mouseState(true), { capture: true, passive: true });
    listen(window, "touchend", mouseState(false), { capture: true, passive: true });
    listen(window, "touchcancel", mouseState(false), { capture: true, passive: true });
    listen(window, "dragend", mouseState(false), { capture: true, passive: true });
    listen(view, "pointerdown", viewPointerDown, { passive: true });
    listen(view, "dblclick", (event) => (event.target === view ? toggleFullscreen() : null));
    listen(pause, "click", playPause);
    listen(rewindButton, "click", () => seek(video.currentTime - skipBack));
    listen(forwardButton, "click", () => seek(video.currentTime + skipForward));
    listen(mute, "click", () => {
        video.muted = !video.muted;
        return;
    });
    listen(fullscreen, "click", toggleFullscreen);
    listen(view.querySelector(".btnPip"), "click", togglePictureInPicture);
    listen(volume, "input", () => setVolume(volume.value));
    listen(position, "change", () => seek(duration() * parseFloat(position.value) / 100));
    listen(position, "keydown", (event) => (event.key === "Enter" && !event.defaultPrevented ? playPause() : null));
    resetIdle();
    return () => {
        cleanup.forEach((remove) => remove());
        Object.values(timers).forEach((timer) => clearTimeout(timer));
        ending.forEach((handler, element) => element.removeEventListener("transitionend", handler));
        video.pause();
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => null);
        }
        return null;
    };
}
