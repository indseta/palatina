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

function clean(body, extension) {
    if (extension !== "svg") {
        return body;
    }
    return Buffer.from(body.toString("utf8").replace(/<!DOCTYPE[^>[]*(\[[^\]]*\])?\s*>/i, ""), "utf8");
}

const sizes = ["fillWidth", "fillHeight", "maxWidth", "maxHeight", "width", "height", "quality"];

function image(url) {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/Images/")) {
        return url;
    }
    sizes.forEach((name) => parsed.searchParams.delete(name));
    return parsed.href;
}

export function createAssets(request, dir) {
    const saved = new Map();
    const images = new Map();
    async function save(url) {
        if (!saved.has(url)) {
            saved.set(url, download(url));
            if (!images.has(image(url))) {
                images.set(image(url), saved.get(url));
            }
        }
        return saved.get(url);
    }
    async function near(url) {
        return images.get(image(url)) ?? save(url);
    }
    async function download(url) {
        const response = await request.get(url);
        const body = await response.body();
        const type = (response.headers()["content-type"] ?? "").split(";")[0];
        const extension = extensions[type] ?? url.split("?")[0].split(".").pop();
        const name = "assets/" + createHash("sha1").update(url).digest("hex").slice(0, 16) + "." + extension;
        await mkdir(dir + "/assets", { recursive: true });
        await writeFile(dir + "/" + name, clean(body, extension));
        return name;
    }
    async function css(text, base) {
        const urls = [...new Set([...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((match) => match[1]).filter((url) => !url.startsWith("data:")))];
        const names = await Promise.all(urls.map((url) => save(new URL(url, base).href)));
        return urls.reduce((result, url, index) => result.replaceAll(url, names[index]), text);
    }
    return {
        save: save,
        near: near,
        css: css
    };
}
