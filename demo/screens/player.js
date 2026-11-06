import { details } from "./details.js";

export async function player(page) {
    await details(page);
    await page.click("#itemDetailPage:not(.hide) .btnPlay:not(.hide)");
    await page.waitForSelector("#videoOsdPage:not(.hide)");
    await page.waitForFunction(() => document.querySelector("video")?.currentTime > 1);
    await page.evaluate(() => document.querySelector("video").pause());
    await page.mouse.move(720, 450);
    await page.mouse.move(730, 460);
    await page.waitForSelector(".videoOsdBottom:not(.hide)");
    await page.waitForTimeout(500);
    return;
}
