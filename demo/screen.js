import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { viewport } from "./config.js";
import { serveTheme } from "./theme.js";
import { login } from "./login.js";
import { screens } from "./screens/index.js";

const name = process.argv[2];
const scale = Number(process.argv[3] ?? 1);
const open = screens[name];

if (!open) {
    console.error("usage: npm run screen -- <" + Object.keys(screens).join("|") + "> [scale]");
    process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: viewport, deviceScaleFactor: scale });
await serveTheme(context);
const page = await context.newPage();
await login(page);
await open(page);
await mkdir(".cache/shots", { recursive: true });
await page.screenshot({ path: ".cache/shots/" + name + ".png" });
await browser.close();
console.log(".cache/shots/" + name + ".png");
