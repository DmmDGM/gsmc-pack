// Imports
import chalk from "chalk";

// Defines print api
export const bad   = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.hex("#df004f")(`[✗] ${message}`));
export const crash = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.redBright(`[!] ${message}`));
export const fail  = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.red(`[-] ${message}`));
export const good  = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.hex("#00df4f")(`[✓] ${message}`));
export const hint  = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.hex("#df4fdf")(`[%] ${message}`));
export const note  = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.gray(`[#] ${message}`));
export const pass  = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.green(`[+] ${message}`));
export const say   = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.cyan(`[@] ${message}`));
export const warn  = (message: unknown, indent: number = 0) => console.log("    ".repeat(indent) + chalk.yellowBright(`[?] ${message}`));

// Defines style api
export const key  = (text: unknown): string => chalk.blue(text);
export const glow = (text: unknown): string => chalk.hex("#4f4fdf")(text);
