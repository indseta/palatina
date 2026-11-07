const state = {
    logo: null
};

function update() {
    state.logo?.style.setProperty("--palatina-scroll", window.scrollY + "px");
    return;
}

function show(event) {
    state.logo = event.target.classList.contains("itemDetailPage") ? event.target.querySelector(".detailLogo") : null;
    update();
    return;
}

export function start() {
    document.addEventListener("viewshow", show);
    window.addEventListener("scroll", update, { passive: true });
    return;
}
