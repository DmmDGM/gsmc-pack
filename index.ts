// Import
import nodePath from "node:path";
import nodeUtil from "node:util";
import { bad, err, fail, glow, good, hint, note, pass, say } from "./pretty";

// Defines globals
export const { values: flags, positionals: args } = nodeUtil.parseArgs({
    allowNegative: false,
    allowPositionals: true,
    args: Bun.argv,
    options: {
        "check-dependency": {
            default: false,
            multiple: false,
            short: "D",
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
        }
    },
    strict: true,
    tokens: false
});

// Defines helpers
export 

// Defines source classes
export class Assume implements Source {
    // Defines origin fields
    readonly origin: string;
    readonly label: string;

    // Defines constructor
    constructor(origin: string, label: string) {
        this.origin = origin;
        this.label = label;
    }

    // Defines origin methods
    async sync(): Promise<boolean> {
        // Skips sync
        hint(`Origin ${glow(this.origin)} is assumed, skipping sync.`);
        return true;
    }
    async test(): Promise<boolean> {
        // Skips test
        hint(`Origin ${glow(this.origin)} is assumed, skipping test.`);
        return true;
    }
}
export class Direct implements Source {
    // Defines origin fields
    readonly origin: string;
    readonly label: string;
    readonly url: string;
    readonly as: string;

    // Defines constructor
    constructor(origin: string, label: string, url: string, as: string) {
        // Updates origin fields
        this.origin = origin;
        this.label = label;
        this.url = url;
        this.as = as;
    }

    // Defines origin methods
    async sync(): Promise<boolean> {
        // Checks file
        const file = Bun.file(nodePath.resolve(flags["pack-directory"], this.as));
        if(!flags["force-sync"] && await file.exists()) {
            hint(`Origin ${glow(this.origin)} already exists, skipping sync.`);
            return true;
        }

        // Creates response
        const response = await fetch(this.url);
        if(!response.ok) {
            fail(`Failed to sync origin ${glow(this.origin)}, leads to a corrupted url.`);
            return false;
        }

        // Writes file
        const bytes = await response.bytes();
        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
        await file.write(bytes);

        // Prints result
        pass(`Successfully synced origin ${glow(this.origin)}, file size ${glow(size)} MiB.`);
        return true;
    }
    async test(): Promise<boolean> {
        // Checks response
        const response = await fetch(this.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${glow(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Prints result
        pass(`Origin ${glow(this.origin)} passes.`);
        return true;
    }
}
export class Modrinth implements Source {
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
    static async dependencies(details: ModrinthDetails): Promise<ModrinthDependencies> {
        // Defines dependency helper
        const treeDependencies = async (ids: string[]) => {
            const slugs = await Promise.allSettled(
                ids.map((id) => Modrinth.slug(id).then((slug) => {
                    if(slug === null) err(`Unknown Modrinth dependency id ${glow(id)}.`);
                    return slug;
                }))
            ).then((promises) => promises
                .filter((promise) => {
                    if(promise.status === "rejected") err(promise.reason);
                    return promise.status === "fulfilled";
                })
                .map((promise) => promise.value)
                .filter((slug) => slug !== null)
            );
            return Object.fromEntries(slugs.map((slug) => [ slug, labels.has(slug) ] as const));
        };

        // Parses dependencies
        const dependencies: ModrinthDependencies = {
            avoids: await treeDependencies(details.dependency.avoids),
            needs: await treeDependencies(details.dependency.needs),
            wants: await treeDependencies(details.dependency.wants)
        };
        return dependencies;
    }
    static async details(slug: string, loader: string, gameVersion: string): Promise<ModrinthDetails | null> {
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
    static async fetch(endpoint: URL | string, options: RequestInit = {}): Promise<Response> {
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
        throw new Error(`Unable to fetch Modrinth endpoint ${glow(endpoint)}.`);
    }
    static async project(slug: string): Promise<ModrinthProject | null> {
        // Creates respones
        const url = new URL(`./project/${slug}`, Modrinth.api);
        const response = await Modrinth.fetch(url);
        if(!response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthProject;
        return result;
    }
    static async slug(id: string): Promise<string | null> {
        // Fetches project
        const project = await Modrinth.project(id);
        if(project === null) return null;

        // Parses slug
        return project.slug;
    }
    static async versions(slug: string, loaders: string[] | null, gameVersions: string[] | null): Promise<ModrinthVersion[] | null> {
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
    async sync(): Promise<boolean> {
        // Fetches details
        const details = await Modrinth.details(this.label, this.platform, this.version);
        if(details === null) {
            fail(`Failed to sync origin ${glow(this.origin)}, not supported on Modrinth.`);
            return false;
        }

        // Checks file
        const file = Bun.file(nodePath.resolve(flags["pack-directory"], details.as));
        if(!flags["force-sync"] && await file.exists()) {
            hint(`Origin ${glow(this.origin)} already exists, skipping sync.`);
            return true;
        }
        
        // Creates response
        const response = await fetch(details.url);
        if(!response.ok) {
            fail(`Failed to sync origin ${glow(this.origin)}, leads to a corrupted url.`);
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
            fail(`Failed to sync origin ${glow(this.origin)}, hash check failed.`);
            return false;
        }

        // Prints result
        pass(`Successfully synced origin ${glow(this.origin)}, file size ${glow(size)} MiB.`);
        return true;
    }
    async test(): Promise<boolean> {
        // Checks details
        const details = await Modrinth.details(this.label, this.platform, this.version);
        if(details === null) {
            fail(`Origin ${glow(this.origin)} fails, not supported on Modrinth.`);
            return false;
        }

        // Checks response
        const response = await fetch(details.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${glow(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Checks dependencies
        const dependencies = flags["check-dependency"] ? await Modrinth.dependencies(details) : null;
        const satisfied = dependencies === null ? true :
            Object.values(dependencies.avoids).every((included) => !included) &&
            Object.values(dependencies.needs).every((included) => included);

        // Prints result
        if(!satisfied) fail(`Origin ${glow(this.origin)} fails, dependencies not satisfied.`);
        else pass(`Origin ${glow(this.origin)} passes.`);
        if(dependencies !== null) {
            for(let dependency in dependencies.needs) {
                const included = dependencies.needs[dependency];
                if(included) good(`Dependency ${dependency} is required and included.`, 1);
                else bad(`Dependency ${dependency} is required but not included.`, 1);
            }
            for(let dependency in dependencies.avoids) {
                const included = dependencies.avoids[dependency];
                if(included) bad(`Dependency ${dependency} is incompatible but included.`, 1);
                else good(`Dependency ${dependency} is incompatible and not included.`, 1);
            }
            for(let dependency in dependencies.wants) {
                const included = dependencies.wants[dependency];
                if(included) good(`Dependency ${dependency} is optional and included.`, 1);
                else note(`Dependency ${dependency} is optional but not included.`, 1);
            }
        }
        return true;
    }
}

// Parses origins
export const origins: string[] = [];
try {
    const result = await import(nodePath.resolve(flags["pack-file"])) as { default: string[]; };
    Object.assign(origins, result.default);
}
catch {
    err(`Cannot find pack file ${glow(flags["pack-file"])}.`);
    process.exit(1);
}

// Parses sources
export const sources: Source[] = [];
for(let i = 0; i < origins.length; i++) {
    // Parses origin
    const origin = origins[i];
    const [ method, ...parameters ] = origin.split(";");
    switch(method) {
        case "assume": {
            // Checks parameters
            if(parameters.length < 1) {
                err(`Origin ${glow(origin)} is missing parameters, expects ${glow("assume;$LABLE")}.`);
                break;
            }

            // Creates source
            const [ label ] = parameters;
            sources.push(new Assume(origin, label));
            break;
        }
        case "direct": {
            // Checks parameters
            if(parameters.length < 3) {
                err(`Origin ${glow(origin)} is missing parameters, expects ${glow("direct;$LABEL;$URL;$AS")}.`);
                break;
            }

            // Creates source
            const [ label, url, as ] = parameters;
            sources.push(new Direct(origin, label, url, as));
            break;
        }
        case "modrinth": {
            // Checks parameters
            if(parameters.length < 3) {
                err(`Origin ${glow(origin)} is missing parameters, expects ${glow("modrinth;$LABEL;$PLATFORM;$VERSION")}.`);
                break;
            }

            // Creates source
            const [ label, platform, version ] = parameters;
            sources.push(new Modrinth(origin, label, platform, version));
            break;
        }
        default: {
            // Prints error
            err(`Invalid origin ${glow(origin)}, unknown method ${glow(method)}`);
            break;
        }
    }
}

// Parses extras
export const labels = new Set(sources.filter((source) => "label" in source).map((source) => source.label));

// Runs script
if(import.meta.main) {
    const action = args[2];
    switch(action) {
        case "sync": {
            const promises = await Promise.allSettled(sources.map((source) => source.sync()));
            const results = promises.map((promise) => {
                if(promise.status === "rejected") {
                    err(promise.reason);
                    return false;
                }
                return promise.value;
            });
            say(`Total of ${results.filter((result) => result).length} / ${sources.length} origins synced.`);
            break;
        }
        case "test": {
            const promises = await Promise.allSettled(sources.map((source) => source.test()));
            const results = promises.map((promise) => {
                if(promise.status === "rejected") {
                    err(promise.reason);
                    return false;
                }
                return promise.value;
            });
            say(`Total of ${results.filter((result) => result).length} / ${sources.length} origins passed.`);
            break;
        }
        default: {
            bad(`Invalid command, unknown action ${glow(action)}.`);
            break;
        }
    }
}
