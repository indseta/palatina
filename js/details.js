function reorder(page) {
    const content = page.querySelector(".detailSectionContent");
    const tracks = page.querySelector(".trackSelections");
    if (content && tracks && content.nextElementSibling !== tracks) {
        content.after(tracks);
    }
    return;
}

export function start() {
    document.addEventListener("viewshow", (event) => {
        const details = event.target.classList.contains("itemDetailPage");
        document.documentElement.classList.toggle("palatina-details", details);
        if (details) {
            reorder(event.target);
        }
        return;
    });
    return;
}
