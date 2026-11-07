function snapshot({ map, overlay }) {
    const urls = [];
    const swap = (url) => {
        if (map === null) {
            urls.push(url);
            return url;
        }
        return map[url] ?? url;
    };
    const absolute = (url) => new URL(url, document.baseURI).href;
    const prepare = (live, clone) => {
        const fields = [...live.querySelectorAll("input, textarea, select")];
        [...clone.querySelectorAll("input, textarea, select")].forEach((field, index) => {
            const source = fields[index];
            if (field.tagName === "SELECT") {
                [...field.options].forEach((option, position) => option.toggleAttribute("selected", source.options[position]?.selected ?? false));
            } else if (field.tagName === "TEXTAREA") {
                field.textContent = source.value;
            } else if (field.type === "checkbox" || field.type === "radio") {
                field.toggleAttribute("checked", source.checked);
            } else if (field.type !== "file") {
                field.setAttribute("value", source.value);
            }
            return;
        });
        clone.querySelectorAll("script, link, style, .page.hide, .blurhash-canvas, .docspinner, .MuiModal-hidden").forEach((element) => element.remove());
        clone.querySelectorAll("video").forEach((video) => {
            const playing = document.querySelector("video");
            video.removeAttribute("src");
            video.removeAttribute("autoplay");
            if (playing?.currentSrc && !playing.currentSrc.startsWith("blob:")) {
                video.setAttribute("src", swap(playing.currentSrc));
            }
            if (video.getAttribute("poster")) {
                video.setAttribute("poster", swap(absolute(video.getAttribute("poster"))));
            }
            return;
        });
        clone.querySelectorAll("[data-src='']").forEach((element) => element.removeAttribute("data-src"));
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
        clone.querySelectorAll("img[src]:not([src=''])").forEach((image) => {
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
        return clone;
    };
    const removable = (element) => element.matches("script, link, style, .page.hide, .blurhash-canvas, .docspinner, .MuiModal-hidden");
    const pathOf = (element) => {
        const path = [];
        let node = element;
        while (node && node !== document.body) {
            if (removable(node)) {
                return null;
            }
            path.unshift([...node.parentElement.children].filter((sibling) => !removable(sibling)).indexOf(node));
            node = node.parentElement;
        }
        return node === document.body ? path : null;
    };
    const active = document.activeElement;
    const video = document.querySelector("video");
    const base = {
        htmlClass: document.documentElement.className,
        dir: document.documentElement.getAttribute("dir") ?? "ltr",
        lang: document.documentElement.getAttribute("lang") ?? "en-us",
        theme: document.documentElement.getAttribute("data-theme") ?? "dark",
        bodyClass: document.body.className,
        bodyStyle: document.body.getAttribute("style") ?? "",
        hash: location.hash,
        time: video ? video.currentTime : null,
        focus: active && active !== document.body ? pathOf(active) : null,
        custom: [...document.querySelectorAll("style")].some((style) => (style.textContent ?? "").includes("palatina"))
    };
    if (overlay) {
        const persistent = (element) => element.id === "reactRoot" || ["appfooter", "docspinner", "tmla-mask", "MuiModal-hidden"].some((name) => element.classList.contains(name)) || element.tagName === "SCRIPT";
        const nodes = [...document.body.children].filter((element) => !overlay.includes(element.outerHTML) && !persistent(element));
        const html = nodes.map((node) => new XMLSerializer().serializeToString(prepare(node, node.cloneNode(true))));
        const changes = (window.palatinaMutations ?? []).filter((change) => document.body.contains(change.target) && !nodes.some((node) => node.contains(change.target))).map((change) => ({ path: pathOf(change.target), name: change.name, value: change.target.getAttribute(change.name) })).filter((change) => change.path !== null && change.path.length > 0);
        const unique = [...new Map(changes.map((change) => [change.path.join("/") + "@" + change.name, change])).values()];
        return { ...base, urls: [...new Set(urls)], nodes: html, changes: unique };
    }
    const html = new XMLSerializer().serializeToString(prepare(document.body, document.body.cloneNode(true)));
    return { ...base, urls: [...new Set(urls)].filter((url) => !url.startsWith("data:")), html: html };
}

function styles() {
    const declarations = (style) => {
        const seen = new Set();
        const parts = [];
        for (let index = 0; index < style.length; index += 1) {
            let name = style[index];
            let value = style.getPropertyValue(name);
            while (value === "" && name.includes("-")) {
                name = name.slice(0, name.lastIndexOf("-"));
                value = style.getPropertyValue(name);
            }
            if (value !== "" && !seen.has(name)) {
                seen.add(name);
                const priority = style.getPropertyPriority(name);
                parts.push(name + ": " + value + (priority ? " !" + priority : ""));
            }
        }
        return parts.join("; ");
    };
    const serialize = (rules) => [...rules].map((rule) => {
        if (rule instanceof CSSStyleRule) {
            const nested = rule.cssRules?.length ? " " + serialize(rule.cssRules) : "";
            return rule.selectorText + " { " + declarations(rule.style) + nested + " }";
        }
        if (rule instanceof CSSMediaRule) {
            return "@media " + rule.conditionText + " { " + serialize(rule.cssRules) + " }";
        }
        if (rule instanceof CSSSupportsRule) {
            return "@supports " + rule.conditionText + " { " + serialize(rule.cssRules) + " }";
        }
        return rule.cssText;
    }).join("\n");
    return [...document.styleSheets].filter((sheet) => !(sheet.ownerNode.textContent ?? "").includes("palatina")).map((sheet) => {
        if (sheet.href) {
            return { href: sheet.href };
        }
        if (sheet.ownerNode.textContent.trim()) {
            return { text: sheet.ownerNode.textContent, base: document.baseURI };
        }
        if (sheet.palatinaRules) {
            return { group: sheet.ownerNode.getAttribute("data-emotion") ?? "rules", rules: sheet.palatinaRules, base: document.baseURI };
        }
        return { text: serialize(sheet.cssRules), base: document.baseURI };
    });
}

function recordRules() {
    const insert = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function (rule, index) {
        const result = insert.call(this, rule, index);
        this.palatinaRules = this.palatinaRules ?? [];
        this.palatinaRules.push(rule);
        return result;
    };
    return;
}

export async function record(context) {
    await context.addInitScript(recordRules);
    return;
}

function appBar() {
    const bar = document.querySelector(".MuiAppBar-root");
    return bar ? { className: bar.className, style: bar.getAttribute("style") ?? "" } : null;
}

async function resolve(page, assets, overlay) {
    const first = await page.evaluate(snapshot, { map: null, overlay: overlay });
    const urls = first.urls.filter((url) => !url.startsWith("data:"));
    const names = await Promise.all(urls.map((url) => assets.save(url)));
    const map = Object.fromEntries(urls.map((url, index) => [url, names[index]]));
    const result = await page.evaluate(snapshot, { map: map, overlay: overlay });
    delete result.urls;
    return result;
}

export async function capture(page, assets) {
    const result = await resolve(page, assets, null);
    const top = await page.evaluate(appBar);
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    const scrolled = await page.evaluate(appBar);
    result.sheets = await page.evaluate(styles);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    result.appBar = top && scrolled && top.className !== scrolled.className ? { top: top, scrolled: scrolled } : null;
    return result;
}

export async function baseline(page) {
    return page.evaluate(() => {
        window.palatinaMutations = [];
        new MutationObserver((records) => records.forEach((record) => window.palatinaMutations.push({ target: record.target, name: record.attributeName }))).observe(document.body, { attributes: true, subtree: true, attributeFilter: ["class", "style", "aria-hidden", "aria-expanded", "tabindex"] });
        return [...document.body.children].map((element) => element.outerHTML);
    });
}

export async function captureOverlay(page, assets, before) {
    const result = await resolve(page, assets, before);
    result.sheets = await page.evaluate(styles);
    return result;
}
