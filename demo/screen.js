import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { server, viewport, clock } from "./config.js";
import { serveTheme } from "./theme.js";
import { login } from "./login.js";
import { routes } from "./routes.js";

const name = process.argv[2];
const scale = Number(process.argv[3] ?? 1);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: viewport, deviceScaleFactor: scale });
await context.clock.setFixedTime(clock);
await serveTheme(context);
const page = await context.newPage();
await login(page);
const specs = await routes(page);
const spec = specs.find((item) => item.name === name);
if (!spec) {
    console.error("usage: npm run screen -- <name> [scale]\n" + specs.map((item) => item.name).join("\n"));
    await browser.close();
    process.exit(1);
}
if (spec.open) {
    await spec.open(page);
} else {
    await page.goto(server + "/web/#/" + spec.hash);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
}
await mkdir(".cache/shots", { recursive: true });
await page.screenshot({ path: ".cache/shots/" + name + ".png" });
await browser.close();
console.log(".cache/shots/" + name + ".png");
