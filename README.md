# Palatina

A Jellyfin 12.4 theme.

## Install

Dashboard > General > Custom CSS, as the first line:

```css
@import url("https://cdn.jsdelivr.net/gh/indseta/palatina@0.2.7/css/palatina.css");
```

JS Injector > Add Script:

- Script URL: `https://cdn.jsdelivr.net/gh/indseta/palatina@0.2.7/js/palatina.js`
- Load as module: on
- Enabled: on
- Plugin setting "Allow external script URLs": on

Every push to `main` raises `version` in `package.json` (`0.1.0`, `0.1.1`, ...), and CI tags the commit with it once the lint check passes. Change the number in both places to update.

## Layout

- `css/palatina.css` imports one file per section. All button styling lives in `css/buttons.css`.
- `css/fonts.css` points the `Noto Sans` family that Jellyfin uses everywhere at Source Sans 3 (`fonts/source-sans-3`, OFL) for Latin, Greek, Cyrillic and Vietnamese. Other scripts keep Noto. `css/base.css` sets the same stack on `html` for TV clients that skip Noto.
- `css/icons.css` swaps Jellyfin's Material icons (font icons and MUI icons) for Fluent UI System Icons, Filled style (`icons/fluent`, MIT). Icons without a mapping keep the Material glyph.
- `js/palatina.js` starts the router; sections register with `onView(pageId, handler)`.
- Section headers above poster rows ("Recently Added in Movies", genre rows) are plain text: `css/buttons.css` hides the arrow and `js/titles.js` removes the link.

## Demo

Requires Docker, ffmpeg, ImageMagick and Node 22.

```sh
npm install
npm run demo:source
npm run demo:up
npm run screen -- player
npm run demo:page
npm run demo:verify
```

`demo:up` runs Jellyfin 12.4 with a generated sample library (`demo/catalog.txt`), a `demo` / `demo` user, the JS Injector plugin and the Palatina import lines. `screen` serves the local theme files in place of jsDelivr and writes `.cache/shots/<screen>.png`. `npm run screen` with no name lists every screen (home, library views, each item, search, settings, dashboard, player).

`demo:page` snapshots every screen of the demo server into `.cache/page/`, a static, clickable copy of the 12.4 client with the theme files loaded next to it, including menus, dialogs and the header scroll state. `demo:verify` screenshots every sample view and compares it with the real server's screenshot from the same run, writing `.cache/verify/report.txt`.
