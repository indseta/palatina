import { start } from "./router.js";
import { start as startHeader } from "./header.js";
import { start as startHome } from "./home.js";
import { start as startPopups } from "./popups.js";
import { start as startSliders } from "./sliders.js";
import { start as startTitles } from "./titles.js";
import { start as startTooltips } from "./tooltips.js";
import { start as startWheel } from "./wheel.js";

start();
startHeader();
startHome();
startPopups();
startSliders();
startTitles();
startTooltips();
startWheel();
