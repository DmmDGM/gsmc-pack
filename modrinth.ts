// Imports
import nodePath from "node:path";
import { fail, glow, hint, pass } from "./pretty";
import { flags } from "./runtime";
import { fmap } from "./toolbox";

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
    static async details(slug: string, loader: string, gameVersion: string) {
        // Fetches project
        const project = await Modrinth.project(slug);
        if(project === null) return null;
        
        // Fetches version
        const versions = await Modrinth.versions(slug, [ loader ], [ gameVersion ])
            .then((result) => result !== null ? result.filter((version) => version.files.length > 0) : null);
        if(versions === null) return null;
        const version = versions.sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published))[0];
        const file = version.files.find((file) => file.primary) ?? version.files[0];

        // Creates details
        const details: ModrinthDetails = {
            as: file.filename,
            dependency: {
                avoids: fmap(version.dependencies, (dependency) => dependency.dependency_type === "incompatible" ? dependency.project_id : null),
                needs: fmap(version.dependencies, (dependency) => dependency.dependency_type === "required" ? dependency.project_id : null),
                wants: fmap(version.dependencies, (dependency) => dependency.dependency_type === "optional" ? dependency.project_id : null)
            },
            hash: file.hashes.sha512,
            size: file.size,
            type: project.project_type,
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
        return null;
    }
    static async project(slug: string) {
        // Initializes response
        const url = new URL(`./project/${slug}`);

        // Creates respones
        const response = await Modrinth.fetch(url);
        if(response === null || !response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthProject;
        return result;
    }
    static async versions(slug: string, loaders: string[] | null, gameVersions: string[] | null) {
        // Initializes response
        const url = new URL(`./project/${slug}/version`, Modrinth.api);
        if(loaders !== null) url.searchParams.append("loaders", JSON.stringify(loaders));
        if(gameVersions !== null) url.searchParams.append("game_versions", JSON.stringify(gameVersions));
        
        // Creates response
        const response = await Modrinth.fetch(url);
        if(response === null || !response.ok) return null;

        // Parses result
        const result = await response.json() as ModrinthVersion[];
        return result;
    }

    // Defines source methods
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

        // Prints result
        pass(`Origin ${glow(this.origin)} passes, resource reachable.`);
        return true;
    }
}

// Exports
export default Modrinth;
