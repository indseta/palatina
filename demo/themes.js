export function onlyTheme(css, theme) {
    return css.replace(/[^{}]*\[data-theme="([^"]+)"\][^{}]*\{[^}]*\}/g, (rule, name) => {
        if (name === theme) {
            return rule;
        }
        return "";
    });
}
