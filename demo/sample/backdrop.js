const latency = 700;
let timer = null;

function reveal(background, image, url) {
    image.style.backgroundImage = url;
    image.classList.add("displayingBackdropImage", "backdropImageFadeIn");
    image.addEventListener("animationend", () => {
        image.classList.remove("backdropImageFadeIn");
        return;
    }, { once: true });
    background.classList.add("withBackdrop");
    return;
}

export function hasBackdrop() {
    return document.querySelector(".backgroundContainer.withBackdrop") !== null;
}

export function loadBackdrop(kept) {
    clearTimeout(timer);
    const background = document.querySelector(".backgroundContainer.withBackdrop");
    const image = document.querySelector(".backdropImage.displayingBackdropImage");
    if (kept || !background || !image) {
        return;
    }
    const url = image.style.backgroundImage;
    document.querySelectorAll(".backdropImage:not(.displayingBackdropImage)").forEach((layer) => {
        layer.style.backgroundImage = "none";
        return;
    });
    background.classList.remove("withBackdrop");
    image.classList.remove("displayingBackdropImage");
    image.style.backgroundImage = "none";
    timer = setTimeout(() => reveal(background, image, url), latency);
    return;
}
