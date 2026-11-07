export function start() {
    document.addEventListener("viewshow", (event) => {
        document.documentElement.classList.toggle("palatina-details", event.target.classList.contains("itemDetailPage"));
        return;
    });
    return;
}
