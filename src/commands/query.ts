// Imports
import type { BuilderArguments } from "yargs";
import type gsmcp from "../gsmc-pack";
import chalk from "chalk";
import clipboard from "clipboardy";
import { GSMCPACK_BUILD, MINECRAFT_LOADER_TYPE_MAP, MinecraftTypeEnum } from "../common";
import { wrapWithIndent } from "../format";
import MinecraftInstance from "../minecraft-instance";
import MinecraftRegistry from "../minecraft-registry";

// Defines command
export const command: string | string[] = [ "query <query>", "q" ];

// Defines description
export const describe: string = chalk.cyan("Retrieve upstream information from online registries");

// Defines builder
export function builder(argv: typeof gsmcp) {
    // Returns options
    return argv
        // Examples
        .example(
            chalk.yellow("$0 query [registry:]<lookup>[@tag]"),
            chalk.cyan("Find 'lookup' from registry 'registry' with tag 'tag'")
        )
        .example(
            chalk.yellow("$0 query modrinth:EsAfCjCV@VfjnbBAT"),
            chalk.cyan("Find 'EsAfCjCV' (aka 'appleskin') from registry 'Modrinth' with tag 'VfjnbBAT'")
        )
        .example(
            chalk.yellow("$0 query [registry:]<lookup>[#loader][=minecraft]"),
            chalk.cyan("Find 'lookup' from registry 'registry' with loader 'loader' and Minecraft version 'minecraft'")
        )
        .example(
            chalk.yellow("$0 query curseforge:fabric-api#fabric=1.21.5"),
            chalk.cyan("Find 'fabric-api' from 'CurseForge' with loader 'Fabric' and Minecraft version '1.21.5'")
        )

        // Options
        .option("copy", {
            alias: "c",
            describe: chalk.magenta("Copy output to clipboard [DANGEROUS]"),
            type: "boolean"
        })
        .option("environment", {
            alias: "e",
            describe: chalk.cyan("Show queried environment"),
            type: "boolean"
        })
        .option("parse", {
            alias: "p",
            describe: chalk.cyan("Parse output for dummies"),
            type: "boolean"
        })

        // Positionals
        .positional("query", {
            demandOption: true,
            describe: chalk.cyan("Input upstream query"),
            type: "string"
        })

        // Usage
        .usage(chalk.bold.yellow(`(gsmc-pack v${GSMCPACK_BUILD}) $0 query <query>`));
}

// Defines handler
export async function handler(argv: BuilderArguments<typeof builder>) {
    // Gets instance
    const instance = new MinecraftInstance(argv.directory);
    console.log(wrapWithIndent(chalk.bold.yellow(`(gsmc-pack v${GSMCPACK_BUILD}) :: Instance '${instance.dirpath}' :: Query '${argv.query}' ==>`), 0));
    
    // Prints environment
    if(argv.environment) {
        const { environment } = await instance.loadGSMCPackJSON();
        const override = instance.parseQuery(argv.query);
        let _minecraft = environment.minecraft;
        let _custompackLoader: string = environment.custompackLoader;
        let _datapackLoader: string = environment.datapackLoader;
        let _resourcepackLoader: string = environment.resourcepackLoader;
        let _shaderpackLoader: string = environment.shaderpackLoader;
        if(override.minecraft !== null) _minecraft = `${chalk.strikethrough(_minecraft)} ${chalk.magenta(override.minecraft)}`;
        if(override.loader !== null) switch(MINECRAFT_LOADER_TYPE_MAP[override.loader]) {
            case MinecraftTypeEnum.MOD:
            case MinecraftTypeEnum.PLUGIN: {
                _custompackLoader = `${chalk.strikethrough(_custompackLoader)} ${chalk.magenta(override.loader)}`;
                break;
            }
            case MinecraftTypeEnum.DATAPACK: {
                _datapackLoader = `${chalk.strikethrough(_datapackLoader)} ${chalk.magenta(override.loader)}`;
                break;
            }
            case MinecraftTypeEnum.RESOURCEPACK: {
                _resourcepackLoader = `${chalk.strikethrough(_resourcepackLoader)} ${chalk.magenta(override.loader)}`;
                break;
            }
            case MinecraftTypeEnum.SHADERPACK: {
                _shaderpackLoader = `${chalk.strikethrough(_shaderpackLoader)} ${chalk.magenta(override.loader)}`;
                break;
            }
        }
        console.log();
        console.log(wrapWithIndent("Environment:"));
        console.log(wrapWithIndent(`Minecraft Version: ${chalk.cyan(_minecraft)}`, 1));
        console.log(wrapWithIndent(`Custompack Loader: ${chalk.cyan(_custompackLoader)}`, 1));
        console.log(wrapWithIndent(`Datapack Loader: ${chalk.cyan(_datapackLoader)}`, 1));
        console.log(wrapWithIndent(`Resourcepack Loader: ${chalk.cyan(_resourcepackLoader)}`, 1));
        console.log(wrapWithIndent(`Shaderpack Loader: ${chalk.cyan(_shaderpackLoader)}`, 1));
    }

    // Prints results
    try {
        // Prints upstream
        const upstream = await instance.resolveQuery(argv.query);
        console.log();
        console.log(wrapWithIndent("Upstream:"));
        console.log(wrapWithIndent(chalk.cyan(upstream), 1, 50));

        // Prints details
        if(argv.parse) {
            const { hash, id, loaders, minecrafts, registry, tag, types, url } = MinecraftRegistry.loadUpstream(upstream);
            console.log();
            console.log(wrapWithIndent("Details:"));
            console.log(wrapWithIndent(`Registry: ${chalk.cyan(registry)}`, 1));
            console.log(wrapWithIndent("Minecraft Versions:", 1));
            console.log(wrapWithIndent(chalk.cyan(minecrafts.join(", ")), 2));
            console.log(wrapWithIndent("Supported Types:", 1));
            console.log(wrapWithIndent(chalk.cyan(types.join(", ")), 2));
            console.log(wrapWithIndent("Supported Loaders:", 1));
            console.log(wrapWithIndent(chalk.cyan(loaders.join(", ")), 2));
            console.log(wrapWithIndent(`Registry ID: ${chalk.cyan(id)}`, 1));
            console.log(wrapWithIndent(`Registry Tag: ${chalk.cyan(tag)}`, 1));
            console.log(wrapWithIndent(`SHA-1 Hash: ${chalk.cyan(hash)}`, 1));
            console.log(wrapWithIndent(`Download URL: ${chalk.cyan(url)}`, 1));
        }

        // Prints clipboard
        if(argv.copy) {
            await clipboard.write(upstream);
            console.log();
            console.log(wrapWithIndent(chalk.gray("Copied to clipboard!")));
        }
    }

    // Prints error
    catch(error) {
        // Prints upstream
        console.log();
        console.log(wrapWithIndent("Upstream:"));
        console.log(wrapWithIndent(chalk.red("Not Found"), 1));
        
        // Prints verbose
        if(argv.verbose) {
            if(error instanceof Error) {
                console.log();
                console.error("Error:", error.message);
            }
        }
    }
}
