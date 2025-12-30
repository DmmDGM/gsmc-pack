// Imports
import type { ChalkInstance } from "chalk";
import chalk from "chalk";

// Defines base functions
export const paint = (
    style: ChalkInstance,
    text: unknown
): string => style(text);
export const print = (
    style: ChalkInstance,
    symbol: string,
    text: unknown,
    indent: number = 0
): void => console.log("    ".repeat(indent) + style(`[${symbol}] ${text}`));

// Defines generic paint functions
export const glow = paint.bind(null, chalk.hex("#4f4fdf"));

// Defines system print functions
export const printCause = print.bind(null, chalk.hex("#dfdf4f"), "?");
export const printError = print.bind(null, chalk.hex("#df8f4f"), "!");
export const printPanic = print.bind(null, chalk.hex("#df004f"), "x");

// Defines test print functions
export const printFail = print.bind(null, chalk.hex("#ff4f4f"), "-");
export const printPass = print.bind(null, chalk.hex("#4fff4f"), "+");

// Defines update print functions
export const printCheck = print.bind(null, chalk.hex("#2fbf4f"), "✓");
export const printCross = print.bind(null, chalk.hex("#bf2f4f"), "✗");

// Defines generic print functions
export const printHint = print.bind(null, chalk.hex("#df4fdf"), "%");
export const printLine = print.bind(null, chalk.hex("#2f8fdf"), "@");
export const printNote = print.bind(null, chalk.hex("#4f4f4f"), "#");
