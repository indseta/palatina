import { server, user, password } from "./config.js";

export async function login(page) {
    await page.goto(server + "/web/#/login");
    await page.waitForSelector("#txtManualName", { state: "attached" });
    const manual = page.locator(".btnManual");
    if (await manual.isVisible()) {
        await manual.click();
    }
    await page.fill("#txtManualName", user);
    await page.fill("#txtManualPassword", password);
    await page.click(".manualLoginForm button[type=submit]");
    await page.waitForSelector("#indexPage .card");
    return;
}
