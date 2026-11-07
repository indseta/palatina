const page = "#videoOsdPage:not(.hide)";
const glyph = 20 / 24;

function offset() {
    const track = document.querySelector(page + " .osdPositionSlider ~ .mdl-slider-background-flex-container .mdl-slider-background-flex");
    const icon = document.querySelector(page + " .videoOsdBottom .btnPause .material-icons");
    const line = track?.getBoundingClientRect();
    const box = icon?.getBoundingClientRect();
    if (!line?.height || !box?.height) {
        return null;
    }
    const gap = box.top + box.height * (1 - glyph) / 2 - line.bottom;
    return window.innerHeight - line.top + gap;
}

function place(sheet) {
    if (!document.querySelector(page) || sheet.classList.contains("actionsheet-fullscreen")) {
        return;
    }
    const bottom = offset();
    if (bottom !== null) {
        document.documentElement.style.setProperty("--palatina-popup-bottom", bottom + "px");
    }
    sheet.classList.add("palatina-osd-popup");
    return;
}

function sweep(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    const sheet = node.matches(".actionSheet") ? node : node.querySelector(".actionSheet");
    if (sheet) {
        place(sheet);
    }
    return;
}

export function start() {
    const observer = new MutationObserver((records) => {
        records.forEach((record) => record.addedNodes.forEach(sweep));
        return;
    });
    observer.observe(document.body, { childList: true });
    return;
}
