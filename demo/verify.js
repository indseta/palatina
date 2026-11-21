import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { viewport, phone } from "./config.js";
import { host } from "./host.js";

const run = promisify(execFile);
const port = 8790;
const root = ".cache/verify";
const data = JSON.parse(await readFile(".cache/page/screens.json", "utf8"));

const sets = [
    {
        prefix: "",
        options: { viewport: viewport },
        size: viewport,
        touch: false,
        set: data
    },
    {
        prefix: "phone-",
        options: phone,
        size: phone.viewport,
        touch: true,
        set: data.phone
    }
];

async function difference(name, size) {
    const result = await run("compare", ["-metric", "AE", "-fuzz", "3%", root + "/real/" + name + ".png", root + "/sample/" + name + ".png", root + "/diff/" + name + ".png"]).catch((error) => error);
    const pixels = Number(String(result.stderr).trim().split(" ")[0]);
    return pixels / (size.width * size.height) * 100;
}

async function press(locator, touch) {
    if (touch) {
        await locator.tap();
    } else {
        await locator.click();
    }
    return;
}

async function rest(page, touch) {
    if (!touch) {
        await page.mouse.move(viewport.width - 1, viewport.height - 1);
    }
    return;
}

async function load(page, name, touch) {
    await page.goto("about:blank");
    await page.goto("http://localhost:" + port + "/#" + name);
    await page.waitForLoadState("load");
    await page.waitForFunction(() => document.body.innerHTML.length > 2000);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    await page.waitForFunction(() => window.palatinaReady === true);
    await page.waitForTimeout(800);
    await page.waitForFunction(() => !document.querySelector(".backdropImageFadeIn"));
    await rest(page, touch);
    await page.waitForTimeout(200);
    return;
}

await rm(root + "/sample", { recursive: true, force: true });
await rm(root + "/diff", { recursive: true, force: true });
await mkdir(root + "/sample", { recursive: true });
await mkdir(root + "/diff", { recursive: true });
const server = host(".cache/page", port);
const browser = await chromium.launch();
const rows = [];
for (const entry of sets.filter((item) => item.set)) {
    const page = await browser.newPage(entry.options);
    for (const name of Object.keys(entry.set.screens)) {
        await load(page, name, entry.touch);
        await page.screenshot({ path: root + "/sample/" + entry.prefix + name + ".png" });
        rows.push([entry.prefix + name, await difference(entry.prefix + name, entry.size)]);
    }
    for (const overlay of entry.set.overlays) {
        await load(page, overlay.screen, entry.touch);
        if (overlay.via) {
            await press(page.locator(overlay.via).first(), entry.touch);
            await page.waitForTimeout(400);
        }
        await press(page.locator(overlay.trigger).first(), entry.touch);
        await page.waitForTimeout(400);
        await rest(page, entry.touch);
        await page.waitForTimeout(300);
        const name = entry.prefix + "overlay-" + overlay.name;
        await page.screenshot({ path: root + "/sample/" + name + ".png" });
        rows.push([name, await difference(name, entry.size)]);
    }
    await page.close();
}
await browser.close();
server.close();
const report = rows.map(([name, percent]) => percent.toFixed(3).padStart(8) + "%  " + name).join("\n");
await writeFile(root + "/report.txt", report + "\n");
console.log(report);
