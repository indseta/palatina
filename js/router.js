const views = new Map();

export function onView(id, handler) {
    views.set(id, handler);
    return;
}

export function start() {
    document.addEventListener("viewshow", (event) => {
        const handler = views.get(event.target.id);
        if (handler) {
            handler(event.target);
        }
        return;
    });
    return;
}
