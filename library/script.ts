// Imports
import nodePath from "node:path";
import nodeUtil from "node:util";
import Assume from "../source/assume";
import Direct from "../source/direct";
import Modrinth from "../source/modrinth";
import { printCause, printPanic, printError, glow, printFail } from "./pretty";

// Handles crash
process.on("uncaughtException", (error) => {
    // Prints panic
    printPanic(error.message);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    // Prints panic
    printPanic(reason);
    process.exit(1);
});

// Checks main
if(!import.meta.main) throw new Error("Script cannot be imported.");

// Parses cli
const cli = nodeUtil.parseArgs({
    allowNegative: false,
    allowPositionals: true,
    args: Bun.argv,
    options: {
        "client-side": {
            default: false,
            multiple: false,
            short: "C",
            type: "boolean"
        },
        "dot-minecraft": {
            default: false,
            multiple: false,
            short: "M",
            type: "boolean"
        },
        "force-sync": {
            default: false,
            multiple: false,
            short: "F",
            type: "boolean"
        },
        "pack-directory": {
            default: "pack/",
            multiple: false,
            short: "d",
            type: "string"
        },
        "pack-file": {
            default: "pack.jsonc",
            multiple: false,
            short: "f",
            type: "string"
        },
        "server-side": {
            default: false,
            multiple: false,
            short: "S",
            type: "boolean"
        }
    },
    strict: true,
    tokens: false
});

// Parses origins
const raw = await import(nodePath.resolve(import.meta.dir, "../", cli.values["pack-file"])) as { default: string[]; };
const origins = Object.assign([] as string[], raw.default);

// Parses sources
const patterns = {
    "assume;$LABEL":                        Assume,
    "direct;$LABEL;$TYPE;$URL;$AS":         Direct,
    "modrinth;$LABEL;$PLATFORM;$VERSION":   Modrinth
};
const sources = origins.map((origin) => {
    // Parses origin
    const [ method, ...parameters ] = origin.split(";");
    for(const pattern in patterns) {
        // Parses pattern
        const [ target, ...expects ] = pattern.split(";");
        if(method !== target) continue;

        // Checks parameters
        if(parameters.length < expects.length) {
            printFail(`Invalid origin ${glow(origin)}, expects pattern ${glow(pattern)}.`);
            return null;
        }

        // Creates source
        const Source = patterns[pattern as keyof typeof patterns];
        return Reflect.construct(Source, [ origin, ...parameters ]) as InstanceType<typeof Source>;
    }

    // Prints fail
    printFail(`Invalid origin ${glow(origin)}, unknown method ${glow(method)}.`);
    return null;
}).filter((source) => source !== null);

// Parses extras
const args = cli.positionals;
const flags = cli.values;
const labels = new Set(sources.map((source) => source.label));

// Parses pack
const pack: Pack = {
    flags,
    args,
    origins,
    sources,
    labels
};
