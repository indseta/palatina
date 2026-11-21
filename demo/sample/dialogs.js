function refreshMode(event) {
    const select = event.target;
    if (select.id === "selectMetadataRefreshMode") {
        select.closest(".dialog")?.querySelectorAll(".fldReplaceExistingImages, .fldReplaceTrickplayImages").forEach((field) => field.classList.toggle("hide", select.value === "scan"));
    }
    return;
}

export function isFormDialog(nodes) {
    return nodes.some((node) => node.querySelector?.(".formDialog"));
}

export function closesDialog(element) {
    return element.classList.contains("dialogContainer") || element.closest(".btnCancel, button[type='submit']") !== null;
}

export function bindDialogs() {
    document.addEventListener("change", refreshMode, true);
    return;
}
