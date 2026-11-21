import { devices } from "playwright";

export const server = "http://localhost:8096";
export const user = "demo";
export const password = "demo";
export const cdn = "https://cdn.jsdelivr.net/gh/indseta/palatina@*/**";
export const clock = new Date("2026-11-06T20:00:00");
export const viewport = {
    width: 1440,
    height: 900
};
export const phone = {
    ...devices["Pixel 7"],
    deviceScaleFactor: 1
};
