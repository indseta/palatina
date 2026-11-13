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

async function person(name, overview, born, place) {
    const item = await api("/Persons/" + encodeURIComponent(name), "GET");
    await api("/Items/" + item.Id, "POST", {
        ...item,
        Overview: overview,
        PremiereDate: born,
        ProductionLocations: [place],
        Genres: item.Genres ?? [],
        Tags: item.Tags ?? [],
        Studios: item.Studios ?? [],
        ProviderIds: item.ProviderIds ?? {},
        LockedFields: item.LockedFields ?? []
    });
    return;
}

async function progress(item, percent) {
    await api("/UserItems/" + item.Id + "/UserData", "POST", { PlaybackPositionTicks: Math.round(item.RunTimeTicks * percent), LastPlayedDate: new Date().toISOString() });
    return;
}

const meridian = await find("Movie", "The Quiet Meridian");
const northbound = await find("Movie", "Northbound");
const harbor = await find("Movie", "Glass Harbor");
const copper = await find("Movie", "Copper Valley");
const signal = await find("Movie", "Signal and Noise");
const starling = await find("Movie", "Starling");
const series = await find("Series", "Harbor Lights");
const episodes = await api("/Items?Recursive=true&IncludeItemTypes=Episode&ParentId=" + series.Id + "&SortBy=ParentIndexNumber,IndexNumber", "GET");
await progress(meridian, 0.35);
await progress(northbound, 0.7);
await progress(copper, 0.5);
await progress(signal, 0.15);
await progress(starling, 0.6);
await api("/UserPlayedItems/" + episodes.Items[0].Id, "POST");
await progress(episodes.Items[1], 0.2);
await api("/UserFavoriteItems/" + harbor.Id, "POST");
await api("/UserPlayedItems/" + (await find("Movie", "Low Tide")).Id, "POST");
await person("Lena Hart", [
    "Lena Hart (born 4 March 1978) is a Norwegian director and screenwriter known for quiet, character-driven drama set along the northern coast. She began her career cutting documentaries for regional television before directing her first short film, which played at festivals across Scandinavia and earned her a place at the national film school.",
    "Her breakthrough came with the coastal drama Harbor Lights, which she developed with writer Owen Price and directed across its first two seasons. Critics praised the series for its patient pacing, its use of natural light and the way it lets small towns carry the weight of their history. She has since directed episodes of several European series and taught directing workshops for young filmmakers.",
    "Her work is often compared to the Nordic documentary tradition she trained in. She favors long takes, small crews and local non-professional actors alongside a recurring ensemble, and she has spoken often about letting weather and daylight set the schedule of a shoot rather than the other way around.",
    "Hart lives in Bergen with her family. She is currently developing a feature film about a lighthouse keeper and her daughter, and a limited series about the fishing communities of the Lofoten islands, both written together with longtime collaborators from her film school years."
].join("\n\n"), "1978-03-04T00:00:00.0000000Z", "Bergen, Norway");
await scenes();
console.log("seeded");
