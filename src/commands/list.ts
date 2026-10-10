// Imports
import type { InferredOptionTypes, Options } from "yargs";
import chalk from "chalk";

// Defines command
export const command: string | string[] = [ "list", "ls" ];
export const describe: string = "test";
export const builder = {

} as const satisfies Record<string, Options>;
export function handler(argv: InferredOptionTypes<typeof builder>) {
    
}
