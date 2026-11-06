export function latinFonts(css) {
    return css.replace(/@font-face\s*\{[^}]*\}/g, (face) => {
        if (/font-family:\s*["']?Noto Sans (HK|JP|KR|SC|TC)/.test(face)) {
            return "";
        }
        if (/unicode-range/.test(face) && !/u\+(0+-0*ff\b|00\?\?|0*100-0*24f\b)/i.test(face)) {
            return "";
        }
        return face;
    });
}
