export const overlays = [
    { name: "user-menu", screen: "home", trigger: "header button[aria-label='User Menu']", links: { "Sign Out": "#/login" } },
    { name: "syncplay-menu", screen: "home", trigger: "button[aria-label='SyncPlay']" },
    { name: "cast-menu", screen: "home", trigger: "button[aria-label='Cast to Device']" },
    { name: "card-menu", screen: "home", trigger: ".card button[data-action='menu']" },
    { name: "movies-view-menu", screen: "movies", trigger: "header button[aria-controls='library-view-menu']", kinds: ["library-movies"], follow: "#library-view-menu li" },
    { name: "tv-view-menu", screen: "tvshows", trigger: "header button[aria-controls='library-view-menu']", kinds: ["library-tvshows"], follow: "#library-view-menu li" },
    { name: "movies-sort", screen: "movies", trigger: "header button[title='Sort']", kinds: ["library-movies"] },
    { name: "movies-view-settings", screen: "movies", trigger: "header button[title='View settings']", kinds: ["library-movies"] },
    { name: "movies-filter", screen: "movies", trigger: "header button[title='Filter']", kinds: ["library-movies"] },
    { name: "tv-sort", screen: "tvshows", trigger: "header button[title='Sort']", kinds: ["library-tvshows"] },
    { name: "tv-view-settings", screen: "tvshows", trigger: "header button[title='View settings']", kinds: ["library-tvshows"] },
    { name: "tv-filter", screen: "tvshows", trigger: "header button[title='Filter']", kinds: ["library-tvshows"] },
    { name: "movie-more", kind: "Movie", trigger: ".btnMoreCommands", kinds: ["Movie"] },
    { name: "series-more", kind: "Series", trigger: ".btnMoreCommands", kinds: ["Series"] },
    { name: "season-more", kind: "Season", trigger: ".btnMoreCommands", kinds: ["Season"] },
    { name: "episode-more", kind: "Episode", trigger: ".btnMoreCommands", kinds: ["Episode"] },
    { name: "player-settings", screen: "player", trigger: ".btnVideoOsdSettings", kinds: ["player"] }
];
