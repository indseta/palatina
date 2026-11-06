import { firstMovie } from "../item.js";

export async function details(page) {
    const id = await firstMovie(page);
    await page.goto(page.url().split("#")[0] + "#/details?id=" + id);
    await page.waitForSelector("#itemDetailPage:not(.hide) .detailPagePrimaryContainer");
    await page.waitForLoadState("networkidle");
    return;
}
