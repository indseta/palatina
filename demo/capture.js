function snapshot(map) {
    const urls = [];
    const swap = (url) => {
        if (map === null) {
            urls.push(url);
            return url;
        }
        return map[url] ?? url;
    };
    const absolute = (url) => new URL(url, document.baseURI).href;
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll("script, link, style, .page.hide, .blurhash-canvas, .docspinner, .MuiModal-hidden").forEach((element) => element.remove());
    const live = document.querySelector("video");
    clone.querySelectorAll("video").forEach((video) => {
        video.removeAttribute("src");
        video.removeAttribute("autoplay");
        if (video.getAttribute("poster")) {
            video.setAttribute("poster", swap(absolute(video.getAttribute("poster"))));
        }
        if (live?.currentSrc && !live.currentSrc.startsWith("blob:")) {
            video.setAttribute("src", swap(live.currentSrc));
        }
        return;
    });
    clone.querySelectorAll("[data-src]").forEach((element) => {
        const url = absolute(element.getAttribute("data-src"));
        if (element.tagName === "IMG") {
            element.setAttribute("src", url);
        } else {
            element.style.backgroundImage = "url(\"" + url + "\")";
        }
        element.removeAttribute("data-src");
        element.classList.remove("lazy-hidden");
        return;
    });
    clone.querySelectorAll("[data-url]").forEach((element) => element.removeAttribute("data-url"));
    clone.querySelectorAll(".lazy-hidden-children").forEach((element) => element.classList.remove("lazy-hidden-children"));
    clone.querySelectorAll("img[src]").forEach((image) => {
        image.setAttribute("src", swap(absolute(image.getAttribute("src"))));
        return;
    });
    clone.querySelectorAll("[style*='url(']").forEach((element) => {
        const match = element.style.backgroundImage.match(/url\("?([^")]+)"?\)/);
        if (match) {
            element.style.backgroundImage = "url(\"" + swap(absolute(match[1])) + "\")";
        }
        return;
    });
    const sheets = [...document.styleSheets].filter((sheet) => !(sheet.ownerNode.textContent ?? "").includes("palatina")).map((sheet) => {
        if (sheet.href) {
            return { href: sheet.href };
        }
        return { text: [...sheet.cssRules].map((rule) => rule.cssText).join("\n"), base: document.baseURI };
    });
    return {
        urls: [...new Set(urls)].filter((url) => !url.startsWith("data:")),
        html: clone.innerHTML,
        htmlClass: document.documentElement.className,
        dir: document.documentElement.getAttribute("dir") ?? "ltr",
        theme: document.documentElement.getAttribute("data-theme") ?? "dark",
        bodyClass: document.body.className,
        sheets: sheets
    };
}

export async function capture(page, assets) {
    const first = await page.evaluate(snapshot, null);
    const names = await Promise.all(first.urls.map((url) => assets.save(url)));
    const map = Object.fromEntries(first.urls.map((url, index) => [url, names[index]]));
    const result = await page.evaluate(snapshot, map);
    return result;
}
