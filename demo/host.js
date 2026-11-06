import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const skeleton = "<!doctype html><html data-theme=\"light\"><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n";
const types = {
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webm: "video/webm",
    woff2: "font/woff2",
    woff: "font/woff",
    ttf: "font/ttf"
};

export function host(root, port) {
    const server = createServer(async (request, response) => {
        const path = decodeURIComponent(request.url.split("?")[0]);
        const page = path === "/";
        const body = await readFile(root + (page ? "/index.html" : path)).catch(() => null);
        if (body === null) {
            response.writeHead(404);
            response.end();
            return;
        }
        const type = page ? "text/html" : types[path.split(".").pop()] ?? "application/octet-stream";
        const range = /bytes=(\d*)-(\d*)/.exec(request.headers.range ?? "");
        if (range && !page) {
            const start = Number(range[1] || 0);
            const end = range[2] ? Number(range[2]) : body.length - 1;
            response.writeHead(206, { "content-type": type, "accept-ranges": "bytes", "content-range": "bytes " + start + "-" + end + "/" + body.length, "content-length": end - start + 1 });
            response.end(body.subarray(start, end + 1));
            return;
        }
        response.writeHead(200, { "content-type": type, "accept-ranges": "bytes" });
        response.end(page ? skeleton + body + "\n</body></html>" : body);
        return;
    });
    server.listen(port);
    return server;
}
