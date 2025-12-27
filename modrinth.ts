// Imports
import nodePath from "node:path";
import { bad, err, fail, glow, good, hint, note, pass } from "./pretty";
import { flags } from "./runtime";
import { fmap, fsettle } from "./toolbox";

// Defines modrinth source
export class Modrinth implements Source {
    // Defines source fields
    readonly origin: string;
    readonly label: string;
    readonly platform: string;
    readonly version: string;

    // Defines modrinth fields
    static readonly api = "https://api.modrinth.com/v2/";
    
    // Defines constructor
    constructor(origin: string, label: string, platform: string, version: string) {
        // Updates source fields
        this.origin = origin;
        this.label = label;
        this.platform = platform;
        this.version = version;
    }
    
    // Defines modrinth methods
    static async dependencies(label: string) {
        // Creates respones
        const response = await Modrinth.fetch(`./project/${label}/dependencies`);
        if(response === null || !response.ok) return null;

        // Parses result
        const result = await response.json() as {
            projects: ModrinthAPIProject[];
            versions: ModrinthAPIVersion[];
        };
        return result;
    }
    static async fetch(endpoint: string, options: RequestInit = {}) {
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
                const duration = parseInt(timeout) * 1000 + 1000;
                err(`Modrinth ratelimit reached, refetching endpoint ${glow(endpoint)} in ${duration} ms.`);
                await Bun.sleep(duration);
                continue;
            }
            
            // Returns response
            return response;
        }

        // Stops fetch
        err(`Modrinth ratelimit reached, failed to fetch endpoint ${glow(endpoint)} in time.`);
        return null;
    }
    static async project(label: string) {
        // Creates respones
        const response = await Modrinth.fetch(`./project/${label}`);
        if(response === null || !response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthAPIProject;
        return result;
    }
    static async versions(label: string, platforms: string[] | null, versions: string[] | null) {        
        // Creates response
        const response = await Modrinth.fetch(`./project/${label}/version?loaders=${JSON.stringify(platforms)}&game_versions=${JSON.stringify(versions)}`);
        if(response === null || !response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthAPIVersion[];
        return result;
    }

    // Defines source methods
    async dep(pack: Pack): Promise<boolean> {
        // Fetches details
        const details = await Modrinth.details(this.label, this.platform, this.version);
        if(details === null) {
            fail(`Cannot check dependencies of origin ${glow(this.origin)}, not supported on Modrinth.`);
            return false;
        }

        // Maps dependencies
        const avoids = await fsettle(details.dependency.avoids.map(async (avoid) => {
            const project = await Modrinth.project(avoid);
            return project !== null ? project.slug : null;
        }));
        const needs = await fsettle(details.dependency.needs.map(async (need) => {
            const project = await Modrinth.project(need);
            return project !== null ? project.slug : null;
        }));
        const wants = await fsettle(details.dependency.needs.map(async (want) => {
            const project = await Modrinth.project(want);
            return project !== null ? project.slug : null;
        }));

        // Checks satisfied
        const satisfied = avoids.every((avoid) => !pack.labels.has(avoid)) && wants.every((need) => pack.labels.has(need));
        
        // Prints result
        if(satisfied) pass(`Origin ${glow(this.origin)} is satisfied.`);
        else fail(`Origin ${glow(this.origin)} is not satisfied.`);
        
        // Prints tree
        for(const need in needs) {
            if(pack.labels.has(need)) good(`Dependency ${glow(need)} is required and included.`, 1);
            else bad(`Dependency ${glow(need)} is required but not included.`, 1); 
        }
        for(const avoid in avoids) {
            if(pack.labels.has(avoid)) bad(`Dependency ${glow(avoid)} is incompatible but included.`, 1);
            else good(`Dependency ${glow(avoid)} is incompatible and not included.`, 1); 
        }
        for(const want in wants) {
            if(pack.labels.has(want)) good(`Dependency ${glow(want)} is optional and included.`, 1);
            else note(`Dependency ${glow(want)} is optional but not included.`, 1); 
        }
        return satisfied;
    }
    async sync(pack: Pack): Promise<boolean> {
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
        pass(`Origin ${glow(this.origin)} synced, file size ${glow(size)} MiB.`);
        return true;
    }
    async test(pack: Pack): Promise<boolean> {
        // Checks details
        const details = await Modrinth.details(this.label, this.platform, this.version);
        if(details === null) {
            // Checks nearest
            if(flags["show-nearest"]) {
                // Checks project
                const project = await Modrinth.project(this.label);
                if(project === null) {
                    fail(`Origin ${glow(this.origin)} fails, not found on Modrinth.`);
                    return false;
                } 

                // Checks platforms
                const platforms = Object.fromEntries(
                    await fsettle(project.loaders.map(async (loader) => {
                        const newest = await Modrinth.details(this.label, loader, null, 1);
                        const oldest = await Modrinth.details(this.label, loader, null, -1);
                        if(newest === null || oldest === null) return null;
                        return [ loader, { oldest: oldest.versions, newest: newest.versions } ] as const;
                    }))
                );

                // Prints result
                fail(`Origin ${glow(this.origin)} fails, not supported on Modrinth.`);
                for(const platform in platforms) {
                    const oldest = platforms[platform].oldest.join(", ");
                    const newest = platforms[platform].newest.join(", ");
                    hint(`Origin ${glow(this.origin)} supports platform ${glow(platform)}, version ${glow(oldest)} - ${glow(newest)}.`, 1);
                }
                return false;
            }

            // Prints result
            fail(`Origin ${glow(this.origin)} fails, not supported on Modrinth.`);
            return false;
        }

        // Checks response
        const response = await fetch(details.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${glow(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Prints result
        pass(`Origin ${glow(this.origin)} passes, resource is reachable.`);
        return true;
    }
}

// Exports
export default Modrinth;
