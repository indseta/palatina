const latency = {
    min: 300,
    spread: 600
};
let timers = [];

function settle(element) {
    element.parentNode?.querySelector(".cardPadder")?.classList.add("lazy-hidden-children");
    return;
}

function reveal(element, url) {
    element.style.backgroundImage = url;
    element.classList.add("lazy-image-fadein-fast");
    element.classList.remove("lazy-hidden");
    element.addEventListener("animationend", () => settle(element), { once: true });
    return;
}

function hold(element) {
    const url = element.style.backgroundImage;
    element.style.backgroundImage = "";
    element.classList.remove("lazy-image-fadein", "lazy-image-fadein-fast");
    element.classList.add("lazy-hidden");
    element.parentNode?.querySelector(".cardPadder")?.classList.remove("lazy-hidden-children");
    timers.push(setTimeout(() => reveal(element, url), latency.min + Math.random() * latency.spread));
    return;
}

export function loadImages(root) {
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
    root.querySelectorAll(":is(.cardImageContainer, .listItemImage).lazy[style*='url(']").forEach(hold);
    return;
}
