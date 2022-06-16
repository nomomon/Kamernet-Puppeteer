import chalk from "chalk";

import Settings from "./settings.js";
import {lookForRooms} from "./kamernet.js";


lookForRooms();
let interval = setInterval(lookForRooms, Settings.TIME_INTERVAL_MINUTES * 60 * 1000);

if (Settings.TIMEOUT_MINUTES !== Infinity) {
    setTimeout(() => {
        console.log(chalk.red("====================================="));
        console.log(chalk.red(chalk.yellow("[INFO]: ") + "Timeout reached, stopping interval."));
        clearInterval(interval)

    }, Settings.TIMEOUT_MINUTES * 60 * 1000)
}
