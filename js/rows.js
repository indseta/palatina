const actions = ["link", "none"];
const controls = "button, a, input, label, select, textarea";

function item(row) {
    return {
        Id: row.dataset.id,
        ServerId: row.dataset.serverid,
        Type: row.dataset.type,
        IsFolder: row.dataset.isfolder === "true",
        MediaType: row.dataset.mediatype,
        CollectionType: row.dataset.collectiontype,
        ChannelId: row.dataset.channelid
    };
}

function open(event) {
    const row = event.target.closest(".itemsContainer > .listItem[data-id]");
    if (event.defaultPrevented || !row || !actions.includes(row.dataset.action) || event.target.closest(controls)) {
        return;
    }
    window.Emby?.Page?.showItem(item(row));
    return;
}

export function start() {
    document.addEventListener("click", open);
    return;
}
