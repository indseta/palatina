export async function home(page) {
    await page.waitForSelector("#indexPage .card");
    await page.waitForLoadState("networkidle");
    return;
}
