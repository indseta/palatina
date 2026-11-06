import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { cdn } from "./config.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = {
    css: "text/css",
    js: "text/javascript",
    woff2: "font/woff2"
};

export async function serveTheme(context) {
    await context.route(cdn, async (route) => {
        const path = new URL(route.request().url()).pathname.split("/").slice(4).join("/");
        const type = types[path.split(".").pop()] ?? "text/plain";
        const body = await readFile(root + path).catch(() => null);
        await route.fulfill(body === null ? { status: 404 } : { status: 200, contentType: type, body: body, headers: { "access-control-allow-origin": "*" } });
        return;
    });
    return;
}
