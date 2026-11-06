const data = await (await fetch("screens.json")).json();
const sections = {
    home: "home",
    movies: "movies",
    tv: "tvshows"
};
let classes = [];
let current = null;

document.head.append(...document.body.querySelectorAll("link, style"));

function screenFor(hash) {
    const [path, query] = hash.replace(/^#\/?/, "").split("?");
    const id = new URLSearchParams(query ?? "").get("id");
    if (path === "details" && data.screens["item-" + id]) {
        return "item-" + id;
    }
    return sections[path] ?? null;
}

function show(name) {
    const screen = data.screens[name] ?? data.screens.home;
    current = screen;
    document.documentElement.classList.remove(...classes);
    classes = screen.htmlClass.split(" ").filter(Boolean);
    document.documentElement.classList.add(...classes);
    document.documentElement.setAttribute("dir", screen.dir);
    document.body.setAttribute("dir", screen.dir);
    document.body.setAttribute("data-theme", screen.theme);
    document.body.className = screen.bodyClass;
    document.body.innerHTML = screen.html;
    window.scrollTo(0, 0);
    document.querySelector(".page:not(.hide)")?.dispatchEvent(new CustomEvent("viewshow", { bubbles: true, detail: {} }));
    return;
}

function scrolled() {
    const bar = document.querySelector(".MuiAppBar-root");
    const states = current?.appBar ?? data.screens.home.appBar;
    if (bar && states) {
        const state = window.scrollY > 0 ? states.scrolled : states.top;
        bar.className = state.className;
        bar.setAttribute("style", state.style);
    }
    return;
}

function go(name) {
    if (location.hash.slice(1) === name) {
        show(name);
    } else {
        location.hash = name;
    }
    return;
}

function click(event) {
    const element = event.target;
    const link = element.closest("a[href^='#']");
    if (link) {
        event.preventDefault();
    }
    if (element.closest(".headerBackButton, .btnBack")) {
        event.preventDefault();
        history.back();
        return;
    }
    if (element.closest(".btnPause")) {
        const video = document.querySelector("video");
        if (video?.paused) {
            video.play();
        } else {
            video?.pause();
        }
        return;
    }
    if (element.closest(".btnPlay, .btnResume, [data-action='play'], [data-action='resume']")) {
        event.preventDefault();
        event.stopPropagation();
        go("player");
        return;
    }
    const target = link ? screenFor(link.getAttribute("href")) : null;
    if (target) {
        go(target);
        return;
    }
    const card = element.closest("[data-id]");
    if (card && data.screens["item-" + card.dataset.id]) {
        event.preventDefault();
        go("item-" + card.dataset.id);
    }
    return;
}

document.addEventListener("click", click, true);
window.addEventListener("scroll", scrolled, { passive: true });
window.addEventListener("hashchange", () => show(location.hash.slice(1) || "home"));
show(location.hash.slice(1) || "home");
