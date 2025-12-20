// Imports
import nodeFile from "node:fs/promises";
import nodePath from "node:path";
import chalk from "chalk";
import { downloadDirect, downloadModrinth, searchModrinth } from "./library";

// Creates folder
try {
    await nodeFile.rm(nodePath.resolve(import.meta.dir, "./pack/"), { recursive: true });
}
catch {
    console.warn(chalk.yellow("WARN:   No pack folder found! Creating one instead."));
}
await nodeFile.mkdir(nodePath.resolve(import.meta.dir, "./pack/"));

// Creates pack
const pack: string[] = [];
try {
    const json = await import("./pack.json" as string) as { default: string[] };
    Object.assign(pack, json.default);
}
catch {
    try {
        const jsonc = await import("./pack.jsonc" as string) as { default: string[] };
        Object.assign(pack, jsonc.default);
    }
    catch {
        throw new Error("No pack.json or pack.jsonc found!");
    }
}

// Downloads pack
let counter = 0;
await Promise.allSettled(pack.map(async (origin, index) => {
    await Bun.sleep(Math.floor(index / 100) * 60 * 1000);
    try {
        const parameters = origin.split(";");
        switch(parameters[0]) {
            case "modrinth": {
                if(parameters.length < 4) throw new Error(`Invalid origin mapping (${origin}).`);
                const [ platform, version, tag, override ] = parameters.slice(1);
                const entry = await searchModrinth(tag, platform, version, override ?? null);
                console.log(chalk.blue(`NOTICE: Downloading ${entry.name} (${entry.tag}) from Modrinth with platform ${entry.platform}, version ${entry.version} and size ${Math.round(entry.size / 1024 / 1024 * 100) / 100} MB.`));
                await downloadModrinth(entry);
                console.log(chalk.magenta(`UPDATE: Finished downloading ${entry.name} (${entry.tag}) from Modrinth.`));
                break;
            }
            case "direct": {
                if(parameters.length < 3) throw new Error(`Invalid origin mapping (${origin}).`);
                const [ tag, url ] = parameters.slice(1);
                console.log(chalk.blue(`NOTICE: Downloading ${tag} from direct URL.`));
                await downloadDirect(tag, url);
                console.log(chalk.magenta(`UPDATE: Finished downloading ${tag} from direct URL.`));
                break;
            }
            default: {
                throw new Error(`Unknown origin mapping (${origin}).`);
            }
        }
        counter++;
    }
    catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(chalk.red("ERROR:  " + message));
    }
}));
console.log(chalk.green(`FINISH: Successfully downloaded ${counter} / ${pack.length} file(s)!`));
