import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { server, viewport, phone, clock } from "./config.js";
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
const sheets = new Map();
const devices = [
    {
        name: "desktop",
        prefix: "",
        options: { viewport: viewport },
        touch: false,
        kinds: null
    },
    {
        name: "phone",
        prefix: "phone-",
        options: phone,
        touch: true,
        kinds: ["home", "library-movies", "library-tvshows", "Movie", "Series", "Season", "Episode", "Person", "search", "preferences", "player", "login"]
    }
];

async function rest(page, device) {
    if (!device.touch) {
        await page.mouse.move(viewport.width - 1, viewport.height - 1);
    }
    return;
}

async function press(locator, device) {
    if (device.touch) {
        await locator.tap();
    } else {
        await locator.click();
    }
    return;
}

async function settle(page, device) {
    await page.waitForLoadState("networkidle");
    const loaded = await page.waitForFunction(() => ![...document.querySelectorAll(".docspinner, .MuiCircularProgress-root")].some((spinner) => spinner.checkVisibility()), null, { timeout: 15000 }).then(() => true).catch(() => false);
    if (!loaded) {
        console.log("still loading", await page.evaluate(() => location.hash));
    }
    await page.waitForTimeout(1000);
    await rest(page, device);
    await page.waitForTimeout(200);
    return;
}

async function open(page, spec, fresh, device) {
    if (spec.open) {
        await spec.open(page);
        return;
    }
    await page.goto(server + "/web/#/" + spec.hash);
    if (fresh) {
        await page.reload();
    }
    await page.waitForSelector(".page:not(.hide), .MuiContainer-root, main");
    await settle(page, device);
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

async function screen(run, spec) {
    await open(run.page, spec, false, run.device);
    const shot = keep(await capture(run.page, run.assets));
    await run.page.screenshot({ path: real + "/" + run.device.prefix + spec.name + ".png" });
    run.screens[spec.name] = { ...shot, kind: spec.kind };
    console.log(run.device.name, "screen", spec.name);
    return;
}

async function follow(run, spec, base, overlay) {
    const page = run.page;
    const count = await page.locator(spec.follow).count();
    const targets = [];
    for (let index = 0; index < count; index += 1) {
        await open(page, base, true, run.device);
        await press(page.locator(spec.trigger).first(), run.device);
        await page.waitForTimeout(500);
        const label = (await page.locator(spec.follow).nth(index).textContent()).trim();
        await press(page.locator(spec.follow).nth(index), run.device);
        await settle(page, run.device);
        const hash = await page.evaluate(() => location.hash);
        targets.push(hash);
        if (!Object.values(run.screens).some((shot) => shot.hash === hash) && !run.extra.some((item) => item.hash === hash.slice(2))) {
            run.extra.push({ name: base.name + "-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), kind: base.kind, hash: hash.slice(2) });
        }
    }
    overlay.follow = { selector: spec.follow, targets: targets };
    return;
}

async function layer(run, spec, specs) {
    const page = run.page;
    const base = specs.find((item) => item.name === spec.screen) ?? specs.find((item) => item.kind === spec.kind);
    if (!base) {
        return null;
    }
    await open(page, base, true, run.device);
    const before = await baseline(page);
    if (spec.via) {
        await press(page.locator(spec.via).first(), run.device);
        await page.waitForTimeout(800);
    }
    const trigger = page.locator(spec.trigger).first();
    if (await trigger.count() === 0 || !await trigger.isVisible()) {
        console.log(run.device.name, "missing trigger", spec.name);
        return null;
    }
    const box = await trigger.boundingBox();
    await press(trigger, run.device);
    await page.waitForTimeout(800);
    await rest(page, run.device);
    await page.waitForTimeout(300);
    await page.screenshot({ path: real + "/" + run.device.prefix + "overlay-" + spec.name + ".png" });
    const shot = await captureOverlay(page, run.assets, before);
    keep(shot);
    const overlay = {
        name: spec.name,
        screen: base.name,
        trigger: spec.trigger,
        via: spec.via ?? null,
        kinds: spec.kinds ?? null,
        links: spec.links ?? null,
        anchor: box,
        nodes: shot.nodes,
        changes: shot.changes,
        focus: shot.focus,
        bodyStyle: shot.bodyStyle
    };
    if (spec.follow) {
        await follow(run, spec, base, overlay);
    }
    console.log(run.device.name, "overlay", spec.name);
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

async function session(browser, device) {
    const context = await browser.newContext(device.options);
    await context.clock.setFixedTime(clock);
    await record(context);
    await serveTheme(context);
    return context;
}

function wanted(device, spec) {
    return !device.kinds || device.kinds.includes(spec.kind);
}

async function pass(browser, device, assets) {
    await promisify(execFile)("sh", ["demo/setup.sh"]);
    const context = await session(browser, device);
    const run = {
        device: device,
        page: await context.newPage(),
        assets: device.touch ? { ...assets, save: assets.near } : assets,
        screens: {},
        extra: []
    };
    await login(run.page);
    const specs = (await routes(run.page)).filter((spec) => wanted(device, spec));
    for (const spec of specs) {
        await screen(run, spec);
    }
    const layers = [];
    for (const spec of overlays.filter((item) => !item.devices || item.devices.includes(device.name))) {
        const overlay = await layer(run, spec, specs);
        if (overlay) {
            layers.push(overlay);
        }
    }
    for (const spec of run.extra) {
        await screen(run, spec);
    }
    const guest = await session(browser, device);
    const door = { ...run, page: await guest.newPage() };
    for (const spec of anonymous) {
        await screen(door, spec);
    }
    await guest.close();
    await context.close();
    return { start: "home", screens: run.screens, overlays: layers };
}

await rm(out, { recursive: true, force: true });
await rm(real, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await mkdir(real, { recursive: true });
const browser = await chromium.launch();
const requests = await browser.newContext();
const assets = createAssets(requests.request, out);
const desktop = await pass(browser, devices[0], assets);
const handheld = await pass(browser, devices[1], assets);
const css = await stylesheet(requests.request, assets);
await browser.close();
await writeFile(out + "/jellyfin.css", "@charset \"UTF-8\";\n" + onlyTheme(css, desktop.screens.home.theme));
await writeFile(out + "/screens.json", JSON.stringify({ ...desktop, phone: handheld }));
for (const file of ["index.html", "sample.js", "api.js", "backdrop.js", "images.js", "scroller.js", "slider.js", "dialogs.js", "player.js", "skip.js", "upnext.js", "sample.css", "upnext.css"]) {
    await cp("demo/sample/" + file, out + "/" + file);
}
await cp("css", out + "/css", { recursive: true });
await cp("js", out + "/js", { recursive: true });
await cp("fonts", out + "/fonts", { recursive: true });
await cp("icons", out + "/icons", { recursive: true });
console.log(out + "/index.html");
