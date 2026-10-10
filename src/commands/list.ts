import { InferredOptionTypes, Options } from "yargs";
import chalk from "chalk";

const command: string | string[] = [ "list", "ls" ];
const describe: string = "test";
const builder = {
} as const satisfies Record<string, Options>;

function handler(argv: InferredOptionTypes<typeof builder>) {
    argv.okay
}
