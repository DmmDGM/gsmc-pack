#!/usr/bin/env bun

// Imports
import { relative as relativePath } from "node:path";
import { cwd as getCurrentDirectory } from "node:process";
import { confirm } from "@inquirer/prompts";
import byteSize from "byte-size";
import chalk from "chalk";
import ProgressBar from "progress";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { wrapWithIndent } from "./format";
import { MinecraftAddon } from "./minecraft-addon";
import { MinecraftDownload } from "./minecraft-download";
import { MinecraftInstance } from "./minecraft-instance";
import { MinecraftRegistry, MinecraftTypeEnum } from "./minecraft-registry";

// Creates instance
const instance = new MinecraftInstance(getCurrentDirectory());

/**
 * Display addon details.
 * @param addon Minecraft addon.
 * @param detailed Whether to print more details.
 */
export async function displayAddonDetails(addon: MinecraftAddon, detailed: boolean = false): Promise<void> {
    // Prints summary
    const pack = await instance.readPackJSON();
    if(addon.upstream !== null) {
        const { hash } = MinecraftRegistry.loadUpstream(addon.upstream);
        const type = MinecraftRegistry.loadUpstreamBestType(addon.upstream, pack.environment);
        const compatible = MinecraftRegistry.satisfiesEnvironment(addon.upstream, pack.environment);
        const _type = chalk.bold.green(`[${type}]`);
        const _hash = chalk.cyan(hash);
        const _compatible = compatible ? chalk.green("(okay)") : chalk.red("(not okay)");
        if(addon.source !== null) {
            const metadata = await addon.readMetadata();
            const _name = chalk.bold.yellow(metadata.name);
            const _path = chalk.bold(relativePath(instance.path, addon.source.name!));
            console.log(wrapWithIndent(`${_type} ${_hash} ${_name} => ${_path} ${_compatible}`, 160, 0));
        }
        else {
            const _name = chalk.bold.gray("(no source)");
            const _path = chalk.bold.gray("(no file)");
            console.log(wrapWithIndent(`${_type} ${_hash} ${_name} => ${_path} ${_compatible}`, 160, 0));
        }
    }
    else if(addon.source !== null) {
        const hash = Bun.CryptoHasher.hash("sha1", await addon.source.arrayBuffer()).toHex();
        const metadata = await addon.readMetadata();
        const _type = chalk.bold.gray("[unknown]");
        const _hash = chalk.cyan(hash);
        const _name = chalk.bold.yellow(metadata.name);
        const _path = chalk.bold(relativePath(instance.path, addon.source.name!));
        const _compatible = chalk.gray("(not linked)");
        console.log(wrapWithIndent(`${_type} ${_hash} ${_name} => ${_path} ${_compatible}`, 160, 0));
    }
    if(!detailed) return;
    
    // Prints source
    if(addon.source !== null) {
        // Prints metadata
        const metadata = await addon.readMetadata();
        const _label = chalk.bold(metadata.label ? `Label: ${metadata.label}` : chalk.gray("(unknown label)"));
        const _authors = chalk.bold(metadata.authors.length ? `Authors: ${metadata.authors.join(", ")}` : chalk.gray("(unknown authors)"));
        const _version = chalk.bold(metadata.version ? `Version: ${metadata.version}` : chalk.gray("(unknown version)"));
        console.log(wrapWithIndent(`${_label} ${chalk.gray("-")} ${_authors} ${chalk.gray("-")} ${_version}`, 160, 1));
        
        // Prints description
        const _description = wrapWithIndent(metadata.description ? chalk.white(metadata.description) : chalk.gray("(no description)"), 160, 2);
        console.log(wrapWithIndent(`${_description}`, 160, 2));
        console.log("");
    }
    
    // Prints upstream
    if(addon.upstream !== null) {
        const { id, loaders, minecrafts, registry, tag } = MinecraftRegistry.loadUpstream(addon.upstream);
        const type = MinecraftRegistry.loadUpstreamBestType(addon.upstream, pack.environment);
        const _minecrafts = chalk.red(chalk.bold("Minecrafts: ") + minecrafts.map((minecraft) => {
            return minecraft === pack.environment.minecraft ? chalk.inverse(minecraft) : minecraft;
        }).join(", "));
        const _loaders = chalk.blue(chalk.bold("Loaders: ") + loaders.map((loader) => {
            return loader === {
                [ MinecraftTypeEnum.DATAPACK ]: pack.environment.datapackLoader,
                [ MinecraftTypeEnum.MOD ]: pack.environment.runtimeLoader,
                [ MinecraftTypeEnum.PLUGIN ]: pack.environment.runtimeLoader,
                [ MinecraftTypeEnum.RESOURCEPACK ]: pack.environment.resourcepackLoader,
                [ MinecraftTypeEnum.SHADERPACK ]: pack.environment.shaderpackLoader,
            }[type] ? chalk.inverse(loader) : loader;
        }).join(", "));
        const _registry = chalk.magenta(chalk.bold("Registry: ") + chalk.inverse(`${registry}:${id}@${tag}`));
        console.log(wrapWithIndent(_minecrafts, 160, 1));
        console.log(wrapWithIndent(_loaders, 160, 1));
        console.log(wrapWithIndent(_registry, 160, 1));
        console.log("");
    }
}

/**
 * Downloads addon with pretty progress bar.
 * @param upstream Upstring string.
 * @param title Download title.
 * @returns Downloaded Minecraft addon.
 */
export async function downloadAddonProgress(download: MinecraftDownload, title: string): Promise<void> {
    // Creates download
    const progress = new ProgressBar(`${title} [:bar] :percent (:elapseds)`, { complete: "#", incomplete: "-", total: download.size, width: 160 });
    return new Promise<void>(async (resolve) => {
        const interval = setInterval(async () => {
            progress.update(await download.getProgress() / download.size);
            if(progress.complete) return resolve(clearInterval(interval));
        }, 50);
    });
}

// Creates interface
const argv = hideBin(process.argv);
const cli = yargs(argv)
    /** Add addons. */
    .command(
        [ "add <queries..>" ],
        chalk.bold.cyanBright("Add an addon to your 'gsmc-pack.json'"),
        (subyargs) => subyargs
            .option("skip", { alias: "s", describe: chalk.bold.cyanBright("Skip download for later") })
            .option("yes", { alias: "y", describe: chalk.bold.cyanBright("Skip confirmation") })
            .positional("queries", { array: true, demandOption: true, describe: chalk.bold.cyanBright("Search query (use '[registry:]lookup[@tag][#loader][=minecraft]')"), type: "string" }),
        async (subyargs) => {
            // Resolves queries
            const pack = await instance.readPackJSON();
            const queries: string[] = [];
            const upstreams: { [ Query in string ]: string; } = {};
            const sizes: { [ Query in string ]: number; } = {};
            for(const query of subyargs.queries) {
                try {
                    if(query in upstreams) continue;
                    const upstream = await instance.resolveQuery(query);
                    queries.push(query);
                    upstreams[query] = upstream;
                    if(!subyargs["skip"]) sizes[query] = await MinecraftRegistry.estimateSource(upstream);
                }
                catch { console.error(chalk.bold.red(`ERROR: Search query '${query}' is not found!`)) }
            }

            // Prints confirmation
            if(!subyargs["yes"]) {
                // Prints upstreams
                console.log(chalk.bold.cyanBright(`=== '${instance.path}' => Adding ${queries.length}/${subyargs.queries.length} Addon(s) ===`));
                console.log(chalk.bold(`You are about to add the following addon(s) to 'gsmc-pack.json':`));
                console.log(wrapWithIndent(queries.map((query, index) => {
                    const { hash, id, registry, tag } = MinecraftRegistry.loadUpstream(upstreams[query]);
                    const _index = chalk.bold.green(`[${index + 1}]`);
                    const _query = chalk.bold.yellow(query);
                    const _registry = chalk.magenta(`${registry}:${id}@${tag}`);
                    if(subyargs["skip"]) return `${_index} ${_query} => ${_registry}`;
                    const _size = chalk.bold(`[${byteSize(sizes[query], { precision: 2, units: "iec" })}]`);
                    const _reinstall = hash in pack.addons ? chalk.gray("(reinstall)") : chalk.bold("(new)");
                    return `${_index} ${_query} => ${_registry} ${_size} ${_reinstall}`;
                }).join(", "), 160, 1));
                console.log("");

                // Prints size
                if(!subyargs["skip"]) {
                    const total = Object.values(sizes).reduce((total, size) => total + size, 0);
                    console.log(chalk.bold(`The total download is ${byteSize(total, { precision: 2, units: "iec" })}.`));
                    console.log("");
                }

                // Awaits confirmation
                if(!await confirm({ default: false, message: "Proceed with download?" })) return;
                console.log("");
            }

            // Downloads addons
            const digits = queries.length.toString().length;
            let complete = 0;
            for(let index = 0; index < queries.length; index++) {
                const query = queries[index];
                const upstream = upstreams[query];
                const { id, registry, tag } = MinecraftRegistry.loadUpstream(upstream);
                const _index = chalk.bold.green(`[${(index + 1).toString().padStart(digits, " ")}/${queries.length}]`);
                const _query = chalk.bold.yellow(query);
                const _registry = chalk.magenta(`${registry}:${id}@${tag}`);
                try {
                    await instance.addUpstream(upstream, true);
                    const [ download ] = await new MinecraftAddon(instance, null, upstream).downloadSource(true);
                    if(!subyargs["skip"]) await downloadAddonProgress(download, `${_index} ${_query} => ${_registry}`);
                    else console.log(`${_index} ${_query} => ${_registry} (okay)`);
                    complete++;
                }
                catch { console.error(chalk.bold.red(`ERROR: Failed to add ${_index} ${_query} => ${_registry}.`)); }
            }
            console.log("");

            // Prints receipt
            console.log(chalk.bold.cyanBright(`Successfully added ${complete}/${queries.length} addon(s).`));
            console.log("");
        }
    )

    /** List addons. */
    .command(
        [ "list", "ls" ],
        chalk.bold.cyanBright("Display addons in your '.minecraft' directory"),
        (subyargs) => subyargs
            .option("detailed", { alias: "d", describe: chalk.bold.cyanBright("Show more information about each addon"), type: "boolean" })
            .option("failing", { alias: "f", describe: chalk.bold.cyanBright("Only show incompatible addons"), type: "boolean" })
            .option("okay", { alias: "k", describe: chalk.bold.cyanBright("Only show compatible addons"), type: "boolean" })
            .option("linked", { alias: "l", describe: chalk.bold.cyanBright("Only show linked addons (in 'gsmc-pack.json' AND file found)"), type: "boolean" })
            .option("missing", { alias: "m", describe: chalk.bold.cyanBright("Only show missing addons (in 'gsmc-pack.json' BUT file not found)"), type: "boolean" })
            .option("unlinked", { alias: "u", describe: chalk.bold.cyanBright("Only show unlinked addons (file found BUT not in 'gsmc-pack.json')"), type: "boolean" })
            .conflicts("failing", "okay")
            .conflicts("okay", "failing")
            .conflicts("linked", [ "missing", "unlinked" ])
            .conflicts("missing", [ "linked", "unlinked" ])
            .conflicts("unlinked", [ "linked", "missing" ]),
        async (subyargs) => {
            // Concatenates addons
            const pack = await instance.readPackJSON();
            const addons = await instance.listAddons();
            const total = addons.linked.length + addons.missing.length + addons.unlinked.length;

            // Filters addons
            let list: MinecraftAddon[] = [];
            if(subyargs["linked"]) list.push(...addons.linked);
            else if(subyargs["missing"]) list.push(...addons.missing);
            else if(subyargs["unlinked"]) list.push(...addons.unlinked);
            else list.push(...addons.linked, ...addons.missing, ...addons.unlinked);
            if(subyargs["failing"]) list = list.filter((addon) => addon.upstream !== null && !MinecraftRegistry.satisfiesEnvironment(addon.upstream, pack.environment));
            else if(subyargs["okay"]) list = list.filter((addon) => addon.upstream !== null && MinecraftRegistry.satisfiesEnvironment(addon.upstream, pack.environment));

            // Lists addons
            console.log(chalk.bold.cyan(`=== '${instance.path}' => Showing ${list.length}/${total} Addon(s) ===`));
            for(const addon of list) await displayAddonDetails(addon, subyargs["detailed"]);
        }
    );

// Prints welcome
if(argv.length === 0) {
    console.log("hai")
}

// Starts interface
else cli
    .scriptName("gsmc-pack")
    .help().alias("h", "help")
    .version().alias("v", "version")
    .strict().fail((message, error, subyargs) => {
        console.log(error);
        subyargs.showHelp("log");
        console.error(message);
    })
    .parse();
