import { bindScrollers } from "./scroller.js";
import { bindSliders } from "./slider.js";
import { startPlayer } from "./player.js";

const data = await (await fetch("screens.json")).json();
const names = Object.keys(data.screens);
const trail = [];
let classes = [];
let current = null;
let layer = null;
let stopPlayer = () => null;
let stopScrollers = () => null;
let autoplay = false;
let pending = null;
let loading = null;

const sheets = [...document.body.querySelectorAll("link, style")];
const theme = sheets.find((sheet) => sheet.getAttribute("href") === "css/palatina.css");
document.head.append(...sheets);
await Promise.all(sheets.filter((sheet) => sheet.tagName === "LINK" && !sheet.sheet).map((sheet) => new Promise((resolve) => {
    sheet.addEventListener("load", resolve, { once: true });
    sheet.addEventListener("error", resolve, { once: true });
    return;
})));
await Promise.all(["400 1em \"Noto Sans\"", "700 1em \"Noto Sans\"", "1em \"Material Icons\""].map((font) => document.fonts.load(font).catch(() => null)));

function parse(xml) {
    return document.importNode(new DOMParser().parseFromString(xml, "application/xhtml+xml").documentElement, true);
}

function resolve(path) {
    return path?.reduce((node, index) => node?.children[index] ?? null, document.body) ?? null;
}

function focus(path) {
    if (path) {
        resolve(path)?.focus({ preventScroll: true });
    } else {
        document.activeElement?.blur();
    }
    return;
}

function key(hash) {
    const [path, query] = hash.replace(/^#!?\/?/, "").split("?");
    const params = new URLSearchParams(query ?? "");
    params.delete("serverId");
    params.sort();
    const rest = params.toString();
    return path + (rest ? "?" + rest : "");
}

function target(hash) {
    const wanted = key(hash);
    const exact = names.find((name) => key(data.screens[name].hash) === wanted);
    if (exact) {
        return exact;
    }
    const [path, query] = wanted.split("?");
    const id = new URLSearchParams(query ?? "").get("id") ?? new URLSearchParams(query ?? "").get("topParentId");
    const near = names.filter((name) => key(data.screens[name].hash).split("?")[0] === path && (!id || data.screens[name].hash.includes(id)));
    return near[0] ?? (path === "" ? "home" : null);
}

function closeLayer() {
    if (layer) {
        layer.nodes.forEach((node) => node.remove());
        layer.undo.forEach(([element, name, value]) => (value === null ? element.removeAttribute(name) : element.setAttribute(name, value)));
        document.body.setAttribute("style", current.bodyStyle);
        layer = null;
    }
    return;
}

function snap(offset, size) {
    const ratio = size ? offset / size : 0;
    return [0, 0.5, 1].reduce((best, value) => (Math.abs(value - ratio) < Math.abs(best - ratio) ? value : best), 0);
}

function anchoring(paper, anchor) {
    const [horizontal, vertical] = (paper.style.transformOrigin || "0px 0px").split(" ").map((value) => parseFloat(value) || 0);
    const x = snap((parseFloat(paper.style.left) || 0) + horizontal - anchor.x, anchor.width);
    const y = snap((parseFloat(paper.style.top) || 0) + vertical - anchor.y, anchor.height);
    return {
        paper: paper,
        x: x,
        y: y,
        originX: horizontal === 0 ? 0 : x,
        originY: vertical === 0 ? 0 : y
    };
}

function overflow(start, size, limit) {
    const margin = 16;
    if (start < margin) {
        return start - margin;
    }
    if (start + size > limit - margin) {
        return start + size - (limit - margin);
    }
    return 0;
}

function place(entry, trigger) {
    const box = trigger.getBoundingClientRect();
    const width = entry.paper.offsetWidth;
    const height = entry.paper.offsetHeight;
    const top = box.top + box.height * entry.y - height * entry.originY;
    const left = box.left + box.width * entry.x - width * entry.originX;
    const dy = overflow(top, height, window.innerHeight);
    const dx = overflow(left, width, window.innerWidth);
    entry.paper.style.top = Math.round(top - dy) + "px";
    entry.paper.style.left = Math.round(left - dx) + "px";
    entry.paper.style.transformOrigin = (width * entry.originX + dx) + "px " + (height * entry.originY + dy) + "px";
    return;
}

function placeSheet(sheet, trigger) {
    const box = trigger.getBoundingClientRect();
    const width = sheet.offsetWidth || 160;
    const height = sheet.offsetHeight || 300;
    const left = box.left + box.width / 2 - width / 2;
    const top = box.top + box.height / 2 - height / 2;
    const overflowX = left + width - window.innerWidth;
    const overflowY = top + height - window.innerHeight;
    sheet.style.left = Math.max(overflowX > 0 ? left - overflowX - 20 : left, 10) + "px";
    sheet.style.top = Math.max(overflowY > 0 ? top - overflowY - 20 : top, 10) + "px";
    return;
}

function resized() {
    if (layer) {
        layer.papers.forEach((entry) => place(entry, layer.trigger));
    }
    return;
}

function openLayer(overlay, trigger) {
    closeLayer();
    const nodes = overlay.nodes.map(parse);
    const papers = overlay.anchor ? nodes.flatMap((node) => [...node.querySelectorAll(".MuiPopover-paper, .MuiMenu-paper")]).map((paper) => anchoring(paper, overlay.anchor)) : [];
    nodes.forEach((node) => {
        document.body.append(node);
        return;
    });
    papers.forEach((entry) => place(entry, trigger));
    nodes.forEach((node) => node.querySelectorAll(".actionSheet[style*='position: fixed']").forEach((sheet) => placeSheet(sheet, trigger)));
    if (overlay.follow) {
        document.querySelectorAll(overlay.follow.selector).forEach((element, index) => element.setAttribute("data-sample-href", overlay.follow.targets[index] ?? ""));
    }
    Object.entries(overlay.links ?? {}).forEach(([label, hash]) => {
        nodes.forEach((node) => node.querySelectorAll("li, a, button").forEach((element) => {
            if (element.textContent.trim() === label) {
                element.setAttribute("data-sample-href", hash);
            }
            return;
        }));
        return;
    });
    const undo = overlay.changes.map((change) => [resolve(change.path), change.name, change.value]).filter(([element]) => element).map(([element, name, value]) => {
        const old = element.getAttribute(name);
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
        return [element, name, old];
    });
    document.body.setAttribute("style", overlay.bodyStyle);
    layer = {
        overlay: overlay,
        nodes: nodes,
        undo: undo,
        papers: papers,
        trigger: trigger
    };
    focus(overlay.focus);
    return;
}

function begin(screen) {
    if (current !== screen) {
        return;
    }
    if (screen.kind === "player") {
        stopPlayer = startPlayer(back);
        if (autoplay) {
            document.querySelector("video")?.play().catch(() => null);
        }
    }
    autoplay = false;
    return;
}

function show(name) {
    clearTimeout(loading);
    closeLayer();
    stopPlayer();
    stopPlayer = () => null;
    const screen = data.screens[name] ?? data.screens[data.start];
    current = screen;
    document.documentElement.classList.remove(...classes);
    classes = screen.htmlClass.split(" ").filter(Boolean);
    document.documentElement.classList.add(...classes);
    document.documentElement.setAttribute("dir", screen.dir);
    document.documentElement.setAttribute("lang", screen.lang ?? "en-us");
    document.documentElement.setAttribute("data-theme", screen.theme);
    document.body.setAttribute("dir", screen.dir);
    document.body.setAttribute("data-theme", screen.theme);
    document.body.className = screen.bodyClass;
    document.body.setAttribute("style", screen.bodyStyle);
    theme.disabled = !screen.custom;
    document.body.replaceChildren(...parse(screen.html).childNodes);
    bindSliders(document.body);
    stopScrollers();
    stopScrollers = bindScrollers(document.body);
    window.scrollTo(0, 0);
    window.palatinaReady = true;
    const video = document.querySelector("video");
    if (video && screen.time !== null) {
        window.palatinaReady = false;
        video.preload = "auto";
        video.addEventListener("loadedmetadata", () => {
            video.currentTime = screen.time;
            return;
        }, { once: true });
        video.addEventListener("seeked", () => {
            window.palatinaReady = true;
            begin(screen);
            return;
        }, { once: true });
        video.load();
    } else {
        begin(screen);
    }
    focus(screen.focus);
    document.querySelector(".page:not(.hide)")?.dispatchEvent(new CustomEvent("viewshow", { bubbles: true, detail: {} }));
    return;
}

function spinner() {
    const element = document.createElement("div");
    const half = (side) => "<div class=\"mdl-spinner__circle-clipper mdl-spinner__" + side + "\"><div class=\"mdl-spinner__circle mdl-spinner__circle" + side[0].toUpperCase() + side.slice(1) + "\"></div></div>";
    element.setAttribute("dir", "ltr");
    element.className = "docspinner mdl-spinner mdlSpinnerActive";
    element.innerHTML = [1, 2, 3, 4].map((layer) => "<div class=\"mdl-spinner__layer mdl-spinner__layer-" + layer + "\">" + half("left") + half("right") + "</div>").join("");
    return element;
}

function load() {
    const player = document.createElement("div");
    const poster = data.screens.player?.html.match(/<video[^>]* poster="([^"]+)"/)?.[1] ?? "";
    player.setAttribute("dir", "ltr");
    player.className = "videoPlayerContainer videoPlayerContainer-onTop";
    player.style.animation = "htmlvideoplayer-zoomin 240ms ease-in normal";
    player.innerHTML = "<video class=\"htmlvideoplayer\" preload=\"metadata\" playsinline=\"\" poster=\"" + poster + "\"></video>";
    closeLayer();
    document.body.classList.add("hide-scroll");
    document.body.insertBefore(player, document.body.firstChild);
    document.body.appendChild(spinner());
    loading = setTimeout(() => go("player"), 3000);
    return;
}

function guard() {
    if (current && document.documentElement.getAttribute("data-theme") !== current.theme) {
        document.documentElement.setAttribute("data-theme", current.theme);
    }
    return;
}

function go(name) {
    if (location.hash.slice(1) === name) {
        show(name);
        return;
    }
    trail.push(name);
    pending = name;
    location.hash = name;
    return;
}

function changed() {
    const name = location.hash.slice(1) || data.start;
    if (name === pending) {
        pending = null;
    } else if (trail.at(-2) === name) {
        trail.pop();
    } else {
        trail.push(name);
    }
    show(name);
    return;
}

function back() {
    trail.pop();
    if (!trail.length) {
        trail.push(data.start);
    }
    const previous = trail.at(-1);
    if (location.hash.slice(1) === previous) {
        show(previous);
        return;
    }
    pending = previous;
    location.hash = previous;
    return;
}

function toggleFavorite(button) {
    const favorite = button.getAttribute("data-isfavorite") !== "true";
    const text = button.querySelector(".button-text");
    button.setAttribute("data-isfavorite", String(favorite));
    button.classList.toggle("ratingbutton-withrating", favorite);
    button.querySelector(".material-icons")?.classList.toggle("ratingbutton-icon-withrating", favorite);
    button.title = favorite ? "Favorite" : "Add to favorites";
    if (text) {
        text.innerText = button.title;
    }
    return;
}

function togglePlayed(button) {
    const played = !button.classList.contains("playstatebutton-played");
    const icon = button.querySelector(".material-icons");
    const text = button.querySelector(".button-text");
    button.classList.toggle("playstatebutton-played", played);
    icon?.classList.toggle("playstatebutton-icon-played", played);
    icon?.classList.toggle("playstatebutton-icon-unplayed", !played);
    button.setAttribute("data-played", String(played));
    button.title = played ? "Watched" : "Mark played";
    if (text) {
        text.innerText = button.title;
    }
    return;
}

function navigate(hash) {
    const name = target(hash);
    if (name) {
        go(name);
    }
    return;
}

function scrolled() {
    const bar = document.querySelector(".MuiAppBar-root");
    const states = current?.appBar ?? data.screens[data.start].appBar;
    if (bar && states && !layer) {
        const state = window.scrollY > 0 ? states.scrolled : states.top;
        bar.className = state.className;
        bar.setAttribute("style", state.style);
    }
    return;
}

function overlayFor(element) {
    for (const overlay of data.overlays) {
        const trigger = element.closest(overlay.trigger);
        if (trigger && (!overlay.kinds || overlay.kinds.includes(current.kind))) {
            return { overlay: overlay, trigger: trigger };
        }
    }
    return null;
}

function click(event) {
    const element = event.target;
    const link = element.closest("[data-sample-href], a[href^='#']");
    const href = link?.getAttribute("data-sample-href") ?? link?.getAttribute("href");
    if (layer && layer.nodes.some((node) => node.contains(element))) {
        event.preventDefault();
        event.stopPropagation();
        closeLayer();
        if (href && href !== "#") {
            navigate(href);
        }
        return;
    }
    if (layer) {
        closeLayer();
    }
    const found = overlayFor(element);
    if (found) {
        event.preventDefault();
        event.stopPropagation();
        openLayer(found.overlay, found.trigger);
        return;
    }
    if (link) {
        event.preventDefault();
    }
    if (element.closest(".headerBackButton, .btnBack, button[aria-label='Back']")) {
        event.preventDefault();
        back();
        return;
    }
    const rating = element.closest("[is='emby-ratingbutton']");
    if (rating) {
        event.preventDefault();
        toggleFavorite(rating);
        return;
    }
    const playstate = element.closest("[is='emby-playstatebutton']");
    if (playstate) {
        event.preventDefault();
        togglePlayed(playstate);
        return;
    }
    if (current.kind === "player") {
        return;
    }
    if (element.closest(".btnPlay, .btnResume, [data-action='play'], [data-action='resume']")) {
        event.preventDefault();
        event.stopPropagation();
        autoplay = true;
        load();
        return;
    }
    if (href && href !== "#") {
        navigate(href);
        return;
    }
    const card = element.closest("[data-id]");
    if (card && data.screens["item-" + card.dataset.id]) {
        event.preventDefault();
        go("item-" + card.dataset.id);
    }
    return;
}

function keydown(event) {
    if (event.key === "Escape") {
        closeLayer();
    }
    return;
}

new MutationObserver(guard).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
document.addEventListener("click", click, true);
document.addEventListener("keydown", keydown);
window.addEventListener("scroll", scrolled, { passive: true });
window.addEventListener("resize", resized);
window.addEventListener("hashchange", changed);
trail.push(location.hash.slice(1) || data.start);
show(trail[0]);
