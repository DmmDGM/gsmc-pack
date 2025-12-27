// Imports
import nodePath from "node:path";
import Assume from "./assume";
import Direct from "./direct";
import Modrinth from "./modrinth";
import { err, glow } from "./pretty";
import { flags } from "./runtime";
import { fmap } from "./toolbox";

// Defines patterns
export const patterns = {
    "assume;$LABEL":                        Assume,
    "direct;$LABEL;$URL;$AS;$TYPE":         Direct,
    "modrinth;$LABEL;$PLATFORM;$VERSION":   Modrinth
} as const;

// Defines file
export const file = import(nodePath.resolve(flags["pack-file"])).catch(() => {
    err(`Cannot find pack file ${glow(flags["pack-file"])}`);
    process.exit(1);
}) as Promise<{ default: string[]; }>;

// Defines origin
export const origins = await file.then((result) => Object.assign([] as string[], result.default));

// Defines sources
export const sources = fmap(origins, (origin) => {
    // Parses origin
    const [ method, ...parameters ] = origin.split(";");
    for(const pattern in patterns) {
        // Checks method
        const [ type, ...expects ] = pattern.split(";");
        if(method !== type) continue;

        // Checks parameters
        if(parameters.length < expects.length) {
            err(`Origin ${glow(origin)} is invalid, expects pattern ${glow(pattern)}.`);
            return null;
        }

        // Creates source
        const Source = patterns[pattern as keyof typeof patterns];
        const source = Reflect.construct(Source, [ origin, ...parameters ]) as InstanceType<typeof Source>;
        return source;
    }
    return null;
});

// Defines labels
export const labels = new Set(sources.map((source) => source.label));

// Exports
export default { origins, sources, labels } as Pack;
