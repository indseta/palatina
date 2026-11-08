const showAtSecondsLeft = 12;
const minimumSecondsLeft = 5;
const next = {
    title: "Harbor Lights - S1:E2 - Low Water",
    runtime: "1m",
    seconds: 60
};

function endsAt(seconds) {
    const end = new Date(Date.now() + seconds * 1000);
    return "Ends at " + end.toLocaleTimeString(document.documentElement.lang || "en-US", { hour: "numeric", minute: "2-digit" });
}

function getHtml() {
    return "<div class=\"flex flex-direction-column flex-grow\">"
        + "<h2 class=\"upNextDialog-nextVideoText\" style=\"margin:.25em 0;\">&nbsp;</h2>"
        + "<h3 class=\"upNextDialog-title\" style=\"margin:.25em 0 .5em;\"></h3>"
        + "<div class=\"flex flex-direction-row upNextDialog-mediainfo\"></div>"
        + "<div class=\"flex flex-direction-row upNextDialog-buttons\" style=\"margin-top:1em;\">"
        + "<button type=\"button\" is=\"emby-button\" class=\"raised raised-mini btnStartNow upNextDialog-button emby-button\">Start Now</button>"
        + "<button type=\"button\" is=\"emby-button\" class=\"raised raised-mini btnHide upNextDialog-button emby-button\">Hide</button>"
        + "</div>"
        + "</div>";
}

export function startUpNext(video, view, osdVisible, finish) {
    const element = view.querySelector(".upNextContainer");
    const state = {
        displayed: false,
        visible: false,
        countdown: 0,
        onHide: null
    };

    function remaining() {
        return Math.max(video.duration - video.currentTime, 0);
    }

    function setNextVideoText() {
        const seconds = Math.max(Math.round(remaining()), 0);
        element.querySelector(".upNextDialog-nextVideoText").innerHTML = "Next Episode Playing in <span class=\"upNextDialog-countdownText\">" + seconds + " Seconds</span>";
        return;
    }

    function clearHideListener() {
        if (state.onHide) {
            element.removeEventListener("transitionend", state.onHide);
            state.onHide = null;
        }
        return;
    }

    function hide() {
        clearInterval(state.countdown);
        clearHideListener();
        if (element.classList.contains("upNextDialog-hidden")) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            state.onHide = () => {
                element.classList.add("hide");
                state.onHide = null;
                state.visible = false;
                resolve();
                return;
            };
            element.addEventListener("transitionend", state.onHide, { once: true });
            void element.offsetWidth;
            element.classList.add("upNextDialog-hidden");
            return;
        });
    }

    function show() {
        element.innerHTML = getHtml();
        element.classList.add("hide", "upNextDialog", "upNextDialog-hidden");
        element.querySelector(".upNextDialog-mediainfo").innerHTML = "<div class=\"mediaInfoItem\">" + next.runtime + "</div><div class=\"endsAt mediaInfoItem\">" + endsAt(next.seconds) + "</div>";
        element.querySelector(".upNextDialog-title").innerText = next.title;
        element.querySelector(".btnHide").addEventListener("click", hide);
        element.querySelector(".btnStartNow").addEventListener("click", () => hide().then(finish));
        clearHideListener();
        element.classList.remove("hide");
        void element.offsetWidth;
        element.classList.remove("upNextDialog-hidden");
        state.visible = true;
        setNextVideoText();
        state.countdown = setInterval(setNextVideoText, 400);
        return;
    }

    function update() {
        const left = remaining();
        if (!state.displayed && !osdVisible() && video.duration && left <= showAtSecondsLeft && left >= minimumSecondsLeft) {
            state.displayed = true;
            show();
        }
        return;
    }

    function stop() {
        clearInterval(state.countdown);
        clearHideListener();
        return;
    }

    return {
        visible: () => state.visible,
        update: update,
        stop: stop
    };
}
