#!/usr/bin/env bun

// Imports
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as query from "./commands/query";
import { GSMCPACK_BUILD } from "./common";

// Creates gsmcp
const gsmcp = yargs(hideBin(process.argv))
    // Example
    .example(
        chalk.yellow("$0 [command] --help"),
        chalk.cyan("Prints useful help menu")
    )
    .example(
        chalk.yellow("$0 --version"),
        chalk.cyan("Prints gsmc-pack version")
    )

    // Options
    .option("directory", {
        alias: [ "d" ],
        describe: chalk.cyan("Instance directory override"),
        type: "string"
    })
    .option("verbose", {
        alias: [ "V" ],
        describe: chalk.cyan("Print additional information"),
        type: "boolean"
    })
    
    // Usage
    .usage(chalk.bold.yellow(`(gsmc-pack v${GSMCPACK_BUILD}) $0 <command> [positionals..] [--options..]`));

// Executes gsmcp
if(import.meta.main) {
    gsmcp
        // Commands
        .command("$0", false, () => {}, (argv) => {
            if(argv.version) console.log(GSMCPACK_BUILD);
            else gsmcp.showHelp();
        })
        .command(query)

        // Settings
        .scriptName("gsmc-pack")
        .help().alias("h", "help").hide("h")
        .version().alias("v", "version").hide("v")
        .strict().fail((message, error) => {
            if(message !== null && typeof message !== "undefined") console.error("Error:", message);
            if(error !== null && typeof error !== "undefined") console.error("Crash:", error.message);
        })
        .wrap(null)

        // Epilog
        .epilog(chalk.gray("PS: You can also use 'gsmcp' instead of 'gsmc-pack'!"))
        .epilog(chalk.gray("- (gsmc-pack) Made w/ 🍞 by DmmD GM .w."))

        // Executes
        .parse();
}

// Exports
export default gsmcp;
