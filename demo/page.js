import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { server, viewport, clock } from "./config.js";
import { serveTheme } from "./theme.js";
import { login } from "./login.js";
import { routes, anonymous } from "./routes.js";
import { overlays } from "./overlays.js";
import { createAssets } from "./assets.js";
import { capture, baseline, captureOverlay, record } from "./capture.js";
import { latinFonts } from "./fonts.js";
import { onlyTheme } from "./themes.js";

const out = ".cache/page";
const real = ".cache/verify/real";
const screens = {};
const sheets = new Map();
const extra = [];

async function settle(page) {
    await page.waitForLoadState("networkidle");
    const loaded = await page.waitForFunction(() => ![...document.querySelectorAll(".docspinner, .MuiCircularProgress-root")].some((spinner) => spinner.checkVisibility()), null, { timeout: 15000 }).then(() => true).catch(() => false);
    if (!loaded) {
        console.log("still loading", await page.evaluate(() => location.hash));
    }
    await page.waitForTimeout(1000);
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.waitForTimeout(200);
    return;
}

async function open(page, spec, fresh) {
    if (spec.open) {
        await spec.open(page);
        return;
    }
    await page.goto(server + "/web/#/" + spec.hash);
    if (fresh) {
        await page.reload();
    }
    await page.waitForSelector(".page:not(.hide), .MuiContainer-root, main");
    await settle(page);
    return;
}

function keep(shot) {
    shot.sheets.forEach((sheet) => {
        if (sheet.rules) {
            const group = sheets.get("group:" + sheet.group) ?? { rules: new Set(), base: sheet.base };
            sheet.rules.forEach((rule) => group.rules.add(rule));
            sheets.set("group:" + sheet.group, group);
            return;
        }
        sheets.set(sheet.href ?? sheet.text, sheet);
        return;
    });
    delete shot.sheets;
    return shot;
}

async function screen(page, assets, spec) {
    await open(page, spec, false);
    const shot = keep(await capture(page, assets));
    await page.screenshot({ path: real + "/" + spec.name + ".png" });
    screens[spec.name] = { ...shot, kind: spec.kind };
    console.log("screen", spec.name);
    return;
}

async function follow(page, spec, base, overlay) {
    const count = await page.locator(spec.follow).count();
    const targets = [];
    for (let index = 0; index < count; index += 1) {
        await open(page, base, true);
        await page.click(spec.trigger);
        await page.waitForTimeout(500);
        const label = (await page.locator(spec.follow).nth(index).textContent()).trim();
        await page.locator(spec.follow).nth(index).click();
        await settle(page);
        const hash = await page.evaluate(() => location.hash);
        targets.push(hash);
        if (!Object.values(screens).some((shot) => shot.hash === hash) && !extra.some((item) => item.hash === hash.slice(2))) {
            extra.push({ name: base.name + "-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), kind: base.kind, hash: hash.slice(2) });
        }
    }
    overlay.follow = { selector: spec.follow, targets: targets };
    return;
}

async function layer(page, assets, spec, specs) {
    const base = specs.find((item) => item.name === spec.screen) ?? specs.find((item) => item.kind === spec.kind);
    await open(page, base, true);
    const before = await baseline(page);
    const trigger = page.locator(spec.trigger).first();
    if (await trigger.count() === 0) {
        console.log("missing trigger", spec.name);
        return null;
    }
    const box = await trigger.boundingBox();
    await trigger.click();
    await page.waitForTimeout(800);
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: real + "/overlay-" + spec.name + ".png" });
    const shot = await captureOverlay(page, assets, before);
    keep(shot);
    const overlay = {
        name: spec.name,
        screen: base.name,
        trigger: spec.trigger,
        kinds: spec.kinds ?? null,
        links: spec.links ?? null,
        anchor: box,
        nodes: shot.nodes,
        changes: shot.changes,
        focus: shot.focus,
        bodyStyle: shot.bodyStyle
    };
    if (spec.follow) {
        await follow(page, spec, base, overlay);
    }
    console.log("overlay", spec.name);
    return overlay;
}

async function stylesheet(request, assets) {
    const parts = await Promise.all([...sheets.values()].map(async (sheet) => {
        if (sheet.href) {
            const response = await request.get(sheet.href);
            return assets.css(latinFonts((await response.body()).toString("utf8")), sheet.href);
        }
        return assets.css(latinFonts(sheet.rules ? [...sheet.rules].join("\n") : sheet.text), sheet.base);
    }));
    return parts.join("\n");
}

async function session(browser) {
    const context = await browser.newContext({ viewport: viewport });
    await context.clock.setFixedTime(clock);
    await record(context);
    await serveTheme(context);
    return context;
}

await rm(out, { recursive: true, force: true });
await rm(real, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await mkdir(real, { recursive: true });
const browser = await chromium.launch();
const context = await session(browser);
const page = await context.newPage();
const assets = createAssets(context.request, out);
await login(page);
const specs = await routes(page);
for (const spec of specs) {
    await screen(page, assets, spec);
}
const layers = [];
for (const spec of overlays) {
    const overlay = await layer(page, assets, spec, specs);
    if (overlay) {
        layers.push(overlay);
    }
}
for (const spec of extra) {
    await screen(page, assets, spec);
}
const guest = await session(browser);
const door = await guest.newPage();
for (const spec of anonymous) {
    await screen(door, assets, spec);
}
const css = await stylesheet(context.request, assets);
await browser.close();
await writeFile(out + "/jellyfin.css", "@charset \"UTF-8\";\n" + onlyTheme(css, screens.home.theme));
await writeFile(out + "/screens.json", JSON.stringify({ start: "home", screens: screens, overlays: layers }));
for (const file of ["index.html", "sample.js", "sample.css"]) {
    await cp("demo/sample/" + file, out + "/" + file);
}
await cp("css", out + "/css", { recursive: true });
await cp("js", out + "/js", { recursive: true });
await cp("fonts", out + "/fonts", { recursive: true });
await cp("icons", out + "/icons", { recursive: true });
console.log(out + "/index.html");
