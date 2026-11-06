const data = await (await fetch("screens.json")).json();
const names = Object.keys(data.screens);
let classes = [];
let current = null;
let layer = null;

const sheets = [...document.body.querySelectorAll("link, style")];
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

function openLayer(overlay, trigger) {
    closeLayer();
    const nodes = overlay.nodes.map(parse);
    const box = trigger.getBoundingClientRect();
    const dx = overlay.anchor ? box.left - overlay.anchor.x : 0;
    const dy = overlay.anchor ? box.top - overlay.anchor.y : 0;
    nodes.forEach((node) => {
        node.querySelectorAll(".MuiPopover-paper, .MuiMenu-paper").forEach((paper) => {
            paper.style.left = (parseFloat(paper.style.left) || 0) + dx + "px";
            paper.style.top = (parseFloat(paper.style.top) || 0) + dy + "px";
            return;
        });
        document.body.append(node);
        return;
    });
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
    layer = { overlay: overlay, nodes: nodes, undo: undo };
    focus(overlay.focus);
    return;
}

function show(name) {
    closeLayer();
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
    document.body.replaceChildren(...parse(screen.html).childNodes);
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
            return;
        }, { once: true });
        video.load();
    }
    focus(screen.focus);
    document.querySelector(".page:not(.hide)")?.dispatchEvent(new CustomEvent("viewshow", { bubbles: true, detail: {} }));
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
    } else {
        location.hash = name;
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
    if (element.closest(".headerBackButton, .btnBack, header button[aria-label='Back']")) {
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
window.addEventListener("hashchange", () => show(location.hash.slice(1) || data.start));
show(location.hash.slice(1) || data.start);
