const server = process.env.DEMO_URL;
const headers = {
    "Authorization": "MediaBrowser Token=" + process.env.DEMO_TOKEN,
    "Content-Type": "application/json"
};

async function api(path, method, body) {
    const response = await fetch(server + path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return response.status === 204 ? null : response.json();
}

async function find(type, name) {
    const result = await api("/Items?Recursive=true&IncludeItemTypes=" + type + "&SearchTerm=" + encodeURIComponent(name), "GET");
    return result.Items[0];
}

async function scenes() {
    const shows = (await api("/Library/VirtualFolders", "GET")).find((folder) => folder.Name === "Shows");
    if (!shows.LibraryOptions.EnableChapterImageExtraction) {
        await api("/Library/VirtualFolders/LibraryOptions", "POST", { Id: shows.ItemId, LibraryOptions: { ...shows.LibraryOptions, EnableChapterImageExtraction: true, ExtractChapterImagesDuringLibraryScan: true } });
    }
    const task = (await api("/ScheduledTasks", "GET")).find((item) => item.Key === "RefreshChapterImages");
    const started = new Date();
    await api("/ScheduledTasks/Running/" + task.Id, "POST");
    while (!(new Date((await api("/ScheduledTasks/" + task.Id, "GET")).LastExecutionResult?.EndTimeUtc ?? 0) > started)) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return;
}

async function progress(item, percent) {
    await api("/UserItems/" + item.Id + "/UserData", "POST", { PlaybackPositionTicks: Math.round(item.RunTimeTicks * percent), LastPlayedDate: new Date().toISOString() });
    return;
}

const meridian = await find("Movie", "The Quiet Meridian");
const northbound = await find("Movie", "Northbound");
const harbor = await find("Movie", "Glass Harbor");
const series = await find("Series", "Harbor Lights");
const episodes = await api("/Items?Recursive=true&IncludeItemTypes=Episode&ParentId=" + series.Id + "&SortBy=ParentIndexNumber,IndexNumber", "GET");
await progress(meridian, 0.35);
await progress(northbound, 0.7);
await api("/UserPlayedItems/" + episodes.Items[0].Id, "POST");
await progress(episodes.Items[1], 0.2);
await api("/UserFavoriteItems/" + harbor.Id, "POST");
await api("/UserPlayedItems/" + (await find("Movie", "Low Tide")).Id, "POST");
await scenes();
console.log("seeded");
