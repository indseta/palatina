import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { server, viewport } from "./config.js";
import { serveTheme } from "./theme.js";
import { login } from "./login.js";
import { library } from "./library.js";
import { createAssets } from "./assets.js";
import { capture } from "./capture.js";
import { latinFonts } from "./fonts.js";
import { player } from "./screens/player.js";

const out = ".cache/page";
const routes = {
    movies: "movies",
    tvshows: "tv"
};

async function visit(page, hash) {
    await page.goto(server + "/web/#/" + hash);
    await page.waitForSelector(".page:not(.hide)");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    return;
}

async function stylesheet(request, assets, sheets) {
    const parts = await Promise.all(sheets.map(async (sheet) => {
        if (sheet.href) {
            const response = await request.get(sheet.href);
            return assets.css(latinFonts((await response.body()).toString("utf8")), sheet.href);
        }
        return assets.css(latinFonts(sheet.text), sheet.base);
    }));
    return parts.join("\n");
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: viewport });
await serveTheme(context);
const page = await context.newPage();
const assets = createAssets(context.request, out);
await login(page);
const content = await library(page);
const screens = {};
const sheets = new Map();
const keep = (shot) => {
    shot.sheets.forEach((sheet) => sheets.set(sheet.href ?? sheet.text, sheet));
    return { html: shot.html, htmlClass: shot.htmlClass, dir: shot.dir, theme: shot.theme, bodyClass: shot.bodyClass };
};
await visit(page, "home");
screens.home = keep(await capture(page, assets));
for (const view of content.views) {
    await visit(page, routes[view.type] + "?topParentId=" + view.id + "&collectionType=" + view.type);
    screens[view.type] = keep(await capture(page, assets));
}
for (const item of content.items) {
    await visit(page, "details?id=" + item.id);
    screens["item-" + item.id] = keep(await capture(page, assets));
}
await player(page);
screens.player = keep(await capture(page, assets));
const css = await stylesheet(context.request, assets, [...sheets.values()]);
await browser.close();
await writeFile(out + "/jellyfin.css", "@charset \"UTF-8\";\n" + css);
await writeFile(out + "/screens.json", JSON.stringify({ items: content.items, screens: screens }));
await cp("demo/sample/index.html", out + "/index.html");
await cp("demo/sample/sample.js", out + "/sample.js");
await cp("css", out + "/css", { recursive: true });
await cp("js", out + "/js", { recursive: true });
console.log(out + "/index.html");
