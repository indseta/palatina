const watched = new WeakSet();

function reorder(page) {
    const content = page.querySelector(".detailSectionContent");
    const tracks = page.querySelector(".trackSelections");
    if (content && tracks && content.nextElementSibling !== tracks) {
        content.after(tracks);
    }
    return;
}

function track(page) {
    const name = page.querySelector(".nameContainer");
    if (!name) {
        return;
    }
    const mark = () => {
        page.classList.toggle("palatina-rendered", name.childElementCount > 0);
        return;
    };
    mark();
    if (!watched.has(name)) {
        watched.add(name);
        new MutationObserver(mark).observe(name, { childList: true });
    }
    return;
}

export function start() {
    document.addEventListener("viewshow", (event) => {
        const details = event.target.classList.contains("itemDetailPage");
        document.documentElement.classList.toggle("palatina-details", details);
        if (details) {
            reorder(event.target);
            track(event.target);
        }
        return;
    });
    return;
}
