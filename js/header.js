const selector = ".MuiAppBar-root > .MuiToolbar-root:first-child";

export function start() {
    const root = document.documentElement;
    const resize = new ResizeObserver((entries) => {
        entries.forEach((entry) => root.style.setProperty("--palatina-header-height", entry.borderBoxSize[0].blockSize + "px"));
        return;
    });
    const state = { toolbar: null };
    const sync = () => {
        const toolbar = document.querySelector(selector);
        if (toolbar !== state.toolbar) {
            if (state.toolbar) {
                resize.unobserve(state.toolbar);
            }
            if (toolbar) {
                resize.observe(toolbar);
            }
            state.toolbar = toolbar;
        }
        toolbar?.classList.toggle("mui-fixed", Boolean(toolbar.nextElementSibling?.matches(".MuiToolbar-root")));
        return;
    };
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
    return;
}
