// Imports
import nodeUtil from "node:util";

// Defines parser
export const parser = nodeUtil.parseArgs({
    allowNegative: false,
    allowPositionals: true,
    args: Bun.argv,
    options: {
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
        "show-nearest": {
            default: false,
            multiple: false,
            short: "N",
            type: "boolean"
        },
        "structured": {
            default: false,
            multiple: false,
            short: "S",
            type: "boolean"
        }
    },
    strict: true,
    tokens: false
});

// Defines runtime
export const flags = parser.values;
export const [ bun, main, ...args ] = parser.positionals;
