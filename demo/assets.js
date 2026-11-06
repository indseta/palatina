import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/gif": "gif",
    "video/webm": "webm",
    "video/mp4": "mp4",
    "font/woff2": "woff2",
    "font/woff": "woff",
    "font/ttf": "ttf",
    "application/font-woff2": "woff2"
};

export function createAssets(request, dir) {
    const saved = new Map();
    async function save(url) {
        if (!saved.has(url)) {
            saved.set(url, download(url));
        }
        return saved.get(url);
    }
    async function download(url) {
        const response = await request.get(url);
        const body = await response.body();
        const type = (response.headers()["content-type"] ?? "").split(";")[0];
        const extension = extensions[type] ?? url.split("?")[0].split(".").pop();
        const name = "assets/" + createHash("sha1").update(url).digest("hex").slice(0, 16) + "." + extension;
        await mkdir(dir + "/assets", { recursive: true });
        await writeFile(dir + "/" + name, body);
        return name;
    }
    async function css(text, base) {
        const urls = [...new Set([...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((match) => match[1]).filter((url) => !url.startsWith("data:")))];
        const names = await Promise.all(urls.map((url) => save(new URL(url, base).href)));
        return urls.reduce((result, url, index) => result.replaceAll(url, names[index]), text);
    }
    return { save: save, css: css };
}
