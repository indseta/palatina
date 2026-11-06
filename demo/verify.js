import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { viewport } from "./config.js";
import { host } from "./host.js";

const run = promisify(execFile);
const port = 8790;
const root = ".cache/verify";
const data = JSON.parse(await readFile(".cache/page/screens.json", "utf8"));

async function difference(name) {
    const result = await run("compare", ["-metric", "AE", "-fuzz", "3%", root + "/real/" + name + ".png", root + "/sample/" + name + ".png", root + "/diff/" + name + ".png"]).catch((error) => error);
    const pixels = Number(String(result.stderr).trim().split(" ")[0]);
    return pixels / (viewport.width * viewport.height) * 100;
}

async function load(page, name) {
    await page.goto("about:blank");
    await page.goto("http://localhost:" + port + "/#" + name);
    await page.waitForLoadState("load");
    await page.waitForFunction(() => document.body.innerHTML.length > 2000);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    await page.waitForFunction(() => window.palatinaReady === true);
    await page.waitForTimeout(800);
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.waitForTimeout(200);
    return;
}

await rm(root + "/sample", { recursive: true, force: true });
await rm(root + "/diff", { recursive: true, force: true });
await mkdir(root + "/sample", { recursive: true });
await mkdir(root + "/diff", { recursive: true });
const server = host(".cache/page", port);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: viewport });
const rows = [];
for (const name of Object.keys(data.screens)) {
    await load(page, name);
    await page.screenshot({ path: root + "/sample/" + name + ".png" });
    rows.push([name, await difference(name)]);
}
for (const overlay of data.overlays) {
    await load(page, overlay.screen);
    await page.locator(overlay.trigger).first().click();
    await page.waitForTimeout(400);
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: root + "/sample/overlay-" + overlay.name + ".png" });
    rows.push(["overlay-" + overlay.name, await difference("overlay-" + overlay.name)]);
}
await browser.close();
server.close();
const report = rows.map(([name, percent]) => percent.toFixed(3).padStart(8) + "%  " + name).join("\n");
await writeFile(root + "/report.txt", report + "\n");
console.log(report);
