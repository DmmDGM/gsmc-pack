// Imports
import nodePath from "node:path";
import { fsync, packd } from "./common";
import Packet from "./packet";
import { glow, good, hint } from "./pretty";

// Defines interfaces
export interface Project {
    additional_categories: string[];
    approved: string | null;
    body: string;
    body_url: string | null;
    categories: string[];
    client_side: string;
    color: number | null;
    description: string;
    discord_url: string | null;
    donation_urls: {
        id: string;
        platform: string;
        url: string;
    }[];
    downloads: number;
    followers: number;
    gallery: {
        created: string;
        description: string | null;
        featured: boolean;
        ordering: number;
        title: string | null;
        url: string;
    }[];
    game_versions: string[];
    icon_url: string | null;
    id: string;
    issues_url: string | null;
    license: {
        id: string;
        name: string;
        url: string | null;
    };
    loaders: string[];
    moderator_message: {
        message: string;
        body: string | null;
    };
    monetization_status: string;
    organization: null;
    project_type: string;
    published: string;
    queued: string | null;
    requested_status: string | null;
    server_side: string;
    slug: string;
    source_url: string | null;
    status: string;
    team: string;
    thread_id: string;
    title: string;
    updated: string;
    versions: string[];
    wiki_url: string | null;
}
export interface Version {
    author_id: string;
    changelog: string | null;
    changelog_url: string | null;
    date_published: string;
    dependencies: {
        dependency_type: string;
        file_name: string | null;
        project_id: string | null;
        version_id: string | null;
    }[];
    downloads: number;
    featurd: boolean;
    files: {
        file_type: string | null;
        filename: string;
        hashes: {
            sha1: string;
            sha512: string;
        };
        id: string;
        primary: boolean;
        size: number;
        url: string;
    }[];
    game_versions: string[];
    id: string;
    loaders: string[];
    name: string;
    project_id: string;
    requested_status: string | null;
    status: string;
    version_number: string;
    version_type: string;
}

// Defines class
export class Modrinth implements Packet {
    // Defines raw fields
    readonly flags: Set<string>;
    readonly origin: string[];

    // Defines origin fields
    readonly label: string;
    readonly platform: string;
    readonly version: string;

    // Defines constructor
    constructor(origin: string[], flags: Set<string>) {
        // Updates raw fields
        this.origin = origin;
        this.flags = flags;
        
        // Parses origin
        if(this.origin.length < 4 || this.origin[0] !== "modrinth")
            throw new Error(`Invalid origin ${glow(this.origin)}, expects ${glow("modrinth;$LABEL;$PLATFORM;$VERSION")}.`);
        [ this.label, this.platform, this.version ] = this.origin.slice(1);
    }

    // Defines modrinth methods
    static async fetch(endpoint: string, options?: RequestInit): Promise<Response> {
        // Initializes response
        const url = new URL(endpoint, "https://api.modrinth.com/v2/");
        const init = options ?? {};
        Object.assign(init.headers ??= {}, { "user-agent": "DmmDGM/gsmc-pack/1.2.0" });
        
        // Attempts fetch
        for(let i = 0; i < 5; i++) {
            // Creates response
            const response = await fetch(url, init);
            
            // Checks ratelimit
            const ratelimit = +response.headers.get("x-ratelimit-remaining")!;
            if(ratelimit <= 0) {
                const timeout = +response.headers.get("x-ratelimit-reset")!;
                await Bun.sleep(timeout * 1000 + 1000);
                continue;
            }
            
            // Returns response
            return response;
        }
        throw new Error(`Modrinth could not be reached due to ratelimit while fetching endpoint ${glow(endpoint)}.`)
    }

    // Defines helper methods
    async grab(): Promise<{
        dependency: {
            avoids: string[];
            needs: string[];
            wants: string[];
        };
        file: string;
        hash: string;
        size: number;
        url: string;
    }> {
        // Creates response
        const response = await Modrinth.fetch(`/project/${this.label}/version`);
        if(!response.ok) throw new Error(`Cannot find origin ${glow(this.origin)} on Modrinth.`);

        // Parses response
        const versions = (await response.json() as Version[])
            .filter((version) => version.files.length > 0)
            .sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published));
        if(versions.length === 0) throw new Error(`Origin ${glow(this.origin)} is not supported on Modrinth.`);
        const version = versions[0];
        const file = version.files.find((file) => file.primary) ?? version.files[0];
        
        // Returns result
        return {
            dependency: {
                avoids: version.dependencies
                    .filter((dependency) => dependency.dependency_type === "incompatible" && dependency.project_id !== null)
                    .map((dependency) => dependency.project_id!),
                needs: version.dependencies
                    .filter((dependency) => dependency.dependency_type === "required" && dependency.project_id !== null)
                    .map((dependency) => dependency.project_id!),
                wants: version.dependencies
                    .filter((dependency) => dependency.dependency_type === "optional" && dependency.project_id !== null)
                    .map((dependency) => dependency.project_id!)
            },
            file: file.filename,
            hash: file.hashes.sha512,
            size: file.size,
            url: file.url,
        };
    }

    // Defines api methods
    async sync(): Promise<void> {
        // Checks flag
        if(this.flags.has("nosync")) {
            hint(`Origin ${glow(this.origin)} has flag ${glow("nosync")}, skipping sync.`);
            return;
        }

        // Grabs data
        const data = await this.grab();
        
        // Loads file
        const file = Bun.file(nodePath.resolve(packd, data.file));

        // Checks fsync
        if(await file.exists() && !fsync) {
            hint(`Origin ${glow(this.origin)} already exists, skipping sync.`);
            return;
        }
        
        // Writes bytes
        const response = await fetch(data.url);
        const bytes = await response.bytes();
        await file.write(bytes);

        // Checks hash
        const hash = new Bun.CryptoHasher("sha512").update(Buffer.from(bytes)).digest("hex");
        if(hash !== data.hash) {
            await file.delete();
            throw new Error(`Origin ${glow(this.origin)} leads to a corrupted file.`);
        }

        // Prints result
        const size = Math.round(data.size / 1024 / 1024 * 100) / 100;
        good(`Successfully synced origin ${glow(this.origin)}, file size ${glow(size)} MiB.`);
    }
    async test(): Promise<void> {
        // Checks flag
        if(this.flags.has("safe")) {
            hint(`Origin ${glow(this.origin)} has flag ${glow("safe")}, skipping test.`);
            return;
        }

        // Grabs data
        const data = await this.grab();

        // Checks url
        const response = await fetch(this.url, {
            method: "HEAD"
        });
        if(!response.ok) throw new Error(`Origin ${glow(origin)} leads to a corrupted URL.`);
        
        // Prints status
        good(`Origin ${glow(this.origin)} is satisfied.`);
    }   
}

// Exports
export default Modrinth;
