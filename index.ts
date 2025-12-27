// Import
import type { ChalkInstance } from "chalk";
import nodePath from "node:path";
import nodeUtil from "node:util";
import chalk from "chalk";

// Defines colors
const blue = chalk.hex("#4f4fdf");
const burn = chalk.hex("#ff4f4f");
const cyan = chalk.hex("#2f8fdf");
const dusk = chalk.hex("#df4f4f");
const gray = chalk.hex("#4f4f4f");
const lime = chalk.hex("#00df4f");
const mint = chalk.hex("#2fbf8f");
const pink = chalk.hex("#df4fdf");
const rose = chalk.hex("#df004f");

// Defines print
const bad  = (message: unknown, indent: number = 0) => print(dusk, "✗", message, indent);
const err  = (message: unknown, indent: number = 0) => print(rose, "!", message, indent);
const fail = (message: unknown, indent: number = 0) => print(burn, "-", message, indent);
const good = (message: unknown, indent: number = 0) => print(mint, "✓", message, indent);
const hint = (message: unknown, indent: number = 0) => print(pink, "%", message, indent);
const note = (message: unknown, indent: number = 0) => print(gray, "#", message, indent);
const pass = (message: unknown, indent: number = 0) => print(lime, "+", message, indent);
const say  = (message: unknown, indent: number = 0) => print(cyan, "@", message, indent);

// Defines helpers
function print(color: ChalkInstance, symbol: string, message: unknown, indent: number = 0): void {
    // Prints message
    console.log("    ".repeat(indent) + color(`[${symbol}] ${message}`));
}
async function settle<Type>(promises: Promise<Type>[]): Promise<Type[]> {
    // Settles promises
    const results = await Promise.allSettled(promises);
    return results
        .filter((result) => {
            if(result.status === "rejected") err(result.reason);
            return result.status === "fulfilled";
        })
        .map((result) => result.value);
}
function warp<In, Out>(array: In[], callback: (value: In, index: number, array: In[]) => Out): NonNullable<Out>[] {
    // Warps array
    return array.map(callback).filter((value) => typeof value !== "undefined" && value !== null);
}

// Defines source classes
class Assume implements Source {
    // Defines origin fields
    readonly origin: string;
    readonly label: string;

    // Defines constructor
    constructor(origin: string, label: string) {
        this.origin = origin;
        this.label = label;
    }

    // Defines origin methods
    async dep(): Promise<boolean> {
        // Skips sync
        hint(`Origin ${blue(this.origin)} is an assumed source, skipping dep.`);
        return true;
    }
    async sync(): Promise<boolean> {
        // Skips sync
        hint(`Origin ${blue(this.origin)} is an assumed source, skipping sync.`);
        return true;
    }
    async test(): Promise<boolean> {
        // Skips test
        hint(`Origin ${blue(this.origin)} is an assumed source, skipping test.`);
        return true;
    }
}
class Direct implements Source {
    // Defines origin fields
    readonly origin: string;
    readonly label: string;
    readonly url: string;
    readonly as: string;
    readonly type: string;

    // Defines constructor
    constructor(origin: string, label: string, url: string, as: string, type: string) {
        // Updates origin fields
        this.origin = origin;
        this.label = label;
        this.url = url;
        this.as = as;
        this.type = type;
    }

    // Defines origin methods
    async dep(): Promise<boolean> {
        return false;
    }
    async sync(): Promise<boolean> {
        // Checks file
        const file = Bun.file(nodePath.resolve(flags["pack-directory"], this.as));
        if(!flags["force-sync"] && await file.exists()) {
            hint(`Origin ${blue(this.origin)} already exists, skipping sync.`);
            return true;
        }

        // Creates response
        const response = await fetch(this.url);
        if(!response.ok) {
            fail(`Failed to sync origin ${blue(this.origin)}, leads to a corrupted url.`);
            return false;
        }

        // Writes file
        const bytes = await response.bytes();
        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
        await file.write(bytes);

        // Prints result
        pass(`Origin ${blue(this.origin)} synced, file size ${blue(size)} MiB.`);
        return true;
    }
    async test(): Promise<boolean> {
        // Checks response
        const response = await fetch(this.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${blue(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Prints result
        pass(`Origin ${blue(this.origin)} passes, resource reachable.`);
        return true;
    }
}
class Modrinth implements Source {
    // Defines origin fields
    readonly origin: string;
    readonly label: string;
    readonly platform: string;
    readonly version: string;

    // Defines modrinth fields
    static readonly api = "https://api.modrinth.com/v2/";
    
    // Defines constructor
    constructor(origin: string, label: string, platform: string, version: string) {
        // Updates origin fields
        this.origin = origin;
        this.label = label;
        this.platform = platform;
        this.version = version;
    }
    
    // Defines modrinth methods
    static async details(slug: string, loader: string, gameVersion: string) {
        // Fetches versions
        const result = await Modrinth.versions(slug, [ loader ], [ gameVersion ]);
        if(result === null) return null;

        // Parses versions
        const versions = result.filter((version) => version.files.length > 0);
        if(versions.length === 0) return null;
        
        // Parses version
        const version = versions.sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published))[0];
        const file = version.files.find((file) => file.primary) ?? version.files[0];

        // Defines dependency helper
        const groupDependencies = (dependencies: typeof version.dependencies, type: string) => {
            return dependencies
                .filter((dependency) => dependency.dependency_type === type)
                .map((dependency) => dependency.project_id)
                .filter((id) => id !== null);
        };

        // Returns details
        const details: ModrinthDetails = {
            as: file.filename,
            dependency: {
                avoids: groupDependencies(version.dependencies, "incompatible"),
                needs: groupDependencies(version.dependencies, "required"),
                wants: groupDependencies(version.dependencies, "optional")
            },
            hash: file.hashes.sha512,
            size: file.size,
            url: file.url,
        };
        return details;
    }
    static async fetch(endpoint: URL | string, options: RequestInit = {}) {
        // Initializes response
        const url = new URL(endpoint, Modrinth.api);
        const init = structuredClone(options);
        const headers = init.headers = new Headers(init.headers);
        headers.set("user-agent", headers.get("user-agent") ?? "DmmDGM/gsmc-pack/1.2.0");
        
        // Attempts fetch
        for(let i = 0; i < 5; i++) {
            // Creates response
            const response = await fetch(url, init);
            
            // Checks ratelimit
            const ratelimit = response.headers.get("x-ratelimit-remaining")!;
            if(parseInt(ratelimit) < 1) {
                const timeout = response.headers.get("x-ratelimit-reset")!;
                await Bun.sleep(parseInt(timeout) * 1000 + 1000);
                continue;
            }
            
            // Returns response
            return response;
        }
        throw new Error(`Unable to fetch Modrinth endpoint ${blue(endpoint)}.`);
    }
    static async project(slug: string) {
        // Creates respones
        const url = new URL(`./project/${slug}`, Modrinth.api);
        const response = await Modrinth.fetch(url);
        if(!response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthProject;
        return result;
    }
    static async versions(slug: string, loaders: string[] | null, gameVersions: string[] | null) {
        // Creates response
        const url = new URL(`./project/${slug}/version`, Modrinth.api);
        if(loaders !== null) url.searchParams.append("loaders", JSON.stringify(loaders));
        if(gameVersions !== null) url.searchParams.append("game_versions", JSON.stringify(gameVersions));
        const response = await Modrinth.fetch(url);
        if(!response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthVersion[];
        return result;
    }

    // Defines origin methods
    async dep(): Promise<boolean> {
        

        // // Checks dependencies
        // const dependencies = flags["check-dependency"] ? await Modrinth.dependencies(details) : null;
        // const satisfied = dependencies === null ? true :
        //     Object.values(dependencies.avoids).every((included) => !included) &&
        //     Object.values(dependencies.needs).every((included) => included);

        // // Prints result
        // if(!satisfied) fail(`Origin ${blue(this.origin)} fails, dependencies not satisfied.`);
        // else pass(`Origin ${blue(this.origin)} passes.`);
        // if(dependencies !== null) {
        //     for(let dependency in dependencies.needs) {
        //         const included = dependencies.needs[dependency];
        //         if(included) good(`Dependency ${dependency} is required and included.`, 1);
        //         else bad(`Dependency ${dependency} is required but not included.`, 1);
        //     }
        //     for(let dependency in dependencies.avoids) {
        //         const included = dependencies.avoids[dependency];
        //         if(included) bad(`Dependency ${dependency} is incompatible but included.`, 1);
        //         else good(`Dependency ${dependency} is incompatible and not included.`, 1);
        //     }
        //     for(let dependency in dependencies.wants) {
        //         const included = dependencies.wants[dependency];
        //         if(included) good(`Dependency ${dependency} is optional and included.`, 1);
        //         else note(`Dependency ${dependency} is optional but not included.`, 1);
        //     }
        // }
        return false;
    }
    async sync(): Promise<boolean> {
        // Fetches details
        const details = await Modrinth.details(this.label, this.platform, this.version);
        if(details === null) {
            fail(`Failed to sync origin ${blue(this.origin)}, not supported on Modrinth.`);
            return false;
        }

        // Checks file
        const file = Bun.file(nodePath.resolve(flags["pack-directory"], details.as));
        if(!flags["force-sync"] && await file.exists()) {
            hint(`Origin ${blue(this.origin)} already exists, skipping sync.`);
            return true;
        }
        
        // Creates response
        const response = await fetch(details.url);
        if(!response.ok) {
            fail(`Failed to sync origin ${blue(this.origin)}, leads to a corrupted url.`);
            return false;
        }

        // Writes file
        const bytes = await response.bytes();
        const size = Math.round(details.size / 1024 / 1024 * 100) / 100;
        await file.write(bytes);
        
        // Checks hash
        const hash = new Bun.CryptoHasher("sha512").update(Buffer.from(bytes)).digest("hex");
        if(hash !== details.hash) {
            await file.delete();
            fail(`Failed to sync origin ${blue(this.origin)}, hash check failed.`);
            return false;
        }

        // Prints result
        pass(`Origin ${blue(this.origin)} synced, file size ${blue(size)} MiB.`);
        return true;
    }
    async test(): Promise<boolean> {
        // Checks details
        const details = await Modrinth.details(this.label, this.platform, this.version);
        if(details === null) {
            fail(`Origin ${blue(this.origin)} fails, not supported on Modrinth.`);
            return false;
        }

        // Checks response
        const response = await fetch(details.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${blue(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Prints result
        pass(`Origin ${blue(this.origin)} passes, resource reachable.`);
        return true;
    }
}

// Parses arguments
const { values: flags, positionals: [ bun, entry, ...args ] } = nodeUtil.parseArgs({
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

// Parses origins
const patterns = {
    "assume;$LABEL": Assume,
    "direct;$LABEL;$URL;$AS;$TYPE": Direct,
    "modrinth;$LABEL;$PLATFORM;$VERSION": Modrinth
} as const;
const origins: string[] = await (import(nodePath.resolve(flags["pack-file"])) as Promise<{ default: string[]; }>)
    .then((result) => Object.assign([], result.default))
    .catch(() => {
        err(`Cannot find pack file ${blue(flags["pack-file"])}.`);
        process.exit(1);
    });
const sources = warp(origins, (origin) => {
    // Parses origin
    const [ method, ...parameters ] = origin.split(";");
    for(const pattern in patterns) {
        // Checks method
        const [ type, ...expects ] = pattern.split(";");
        if(method !== type) continue;

        // Checks parameters
        if(parameters.length < expects.length) {
            err(`Origin ${blue(origin)} is invalid, expects pattern ${blue(pattern)}.`);
            return null;
        }

        // Creates source
        const Source = patterns[pattern as keyof typeof patterns];
        return Reflect.construct(Source, [ origin, ...parameters ]) as InstanceType<typeof Source>;
    }
    return null;
});
const labels = new Set(sources.map((source) => source.label));

// Runs script
if(import.meta.main) {
    const action = args[0];

    switch(action) {
        case "sync": {
            const results = await settle(sources.map((source) => source.sync()));
            say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins synced.`);
            break;
        }
        case "test": {
            const results = await settle(sources.map((source) => source.test()));
            say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins passed.`);
            break;
        }
        default: {
            bad(`Invalid command, unknown action ${blue(action)}.`);
            break;
        }
    }
}
