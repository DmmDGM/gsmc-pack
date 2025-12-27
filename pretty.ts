// Imports
import type { ChalkInstance } from "chalk";
import chalk from "chalk";

// Defines helper
function print(color: ChalkInstance, symbol: string, message: unknown, indent: number = 0): void {
    // Prints message
    console.log("    ".repeat(indent) + color(`[${symbol}] ${message}`));
}

// Defines print
export const bad  = (message: unknown, indent: number = 0) => print(chalk.hex("#df4f4f"), "✗", message, indent);
export const err  = (message: unknown, indent: number = 0) => print(chalk.hex("#df004f"), "!", message, indent);
export const fail = (message: unknown, indent: number = 0) => print(chalk.hex("#ff4f4f"), "-", message, indent);
export const good = (message: unknown, indent: number = 0) => print(chalk.hex("#2fbf8f"), "✓", message, indent);
export const hint = (message: unknown, indent: number = 0) => print(chalk.hex("#df4fdf"), "%", message, indent);
export const note = (message: unknown, indent: number = 0) => print(chalk.hex("#4f4f4f"), "#", message, indent);
export const pass = (message: unknown, indent: number = 0) => print(chalk.hex("#00df4f"), "+", message, indent);
export const say  = (message: unknown, indent: number = 0) => print(chalk.hex("#2f8fdf"), "@", message, indent);

// Defines style
export const glow = chalk.hex("#4f4fdf");
