// Imports
import nodePath from "node:path";
import { bad, err, fail, glow, good, hint, note, pass } from "../pretty";

// Defines packet interface
export interface Packet {
    flags: Set<string>;
    label: string;
    method: string;
    origin: string;
}
export interface AssumePacket extends Packet {
    method: "assume";
}
export interface DirectPacket extends Packet {
    file: string;
    method: "direct";
    url: string;
}
export interface ModrinthPacket extends Packet {
    avoids: string[];
    date: number;
    hash: string;
    file: string;
    method: "modrinth";
    needs: string[];
    platforms: string[];
    project: string;
    revision: string;
    size: number;
    url: string;
    versions: string[];
    wants: string[];
}

// Defines modrinth interface
export interface ModrinthProject {
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
export interface ModrinthVersion {
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

// Defines constants
export const packd = nodePath.resolve(import.meta.dir, "../", process.env.PACKD ?? "pack/");
export const packf = nodePath.resolve(import.meta.dir, "../", process.env.PACKF ?? "pack.jsonc");

// Defines helper api
export async function resolve<Type>(promises: Promise<Type>[]): Promise<Type[]> {
    // Resolves tasks
    const results: Type[] = [];
    await Promise.all(promises.map(async (promise) => {
        try {
            results.push(await promise);
        }
        catch(error) {
            err(error instanceof Error ? error.message : String(error));
        }
    }));
    return results;
}

// Defines modrinth api
export async function modrinth(endpoint: string): Promise<Response> {
    // Creates url
    const url = new URL(endpoint, "https://api.modrinth.com/v2/");
    
    // Attempts fetch
    for(let i = 0; i < 5; i++) {
        // Creates response
        const response = await fetch(url, {
            headers: {
                "user-agent": "DmmDGM/gsmc-pack/1.1.0"
            }
        });
        
        // Checks ratelimit
        const ratelimit = +response.headers.get("x-ratelimit-remaining")!;
        if(ratelimit === 0) {
            const timeout = +response.headers.get("x-ratelimit-reset")!;
            await Bun.sleep(timeout * 1000 + 1000);
            continue;
        }
        
        // Returns response
        return response;
    }
    throw new Error(`Modrinth could not be reached due to ratelimit while fetching endpoint ${glow(endpoint)}.`)
}

// Defines internal api
export async function origins(): Promise<string[]> {
    // Parses origins
    try {
        const result = await import(packf) as { default: string[]; };
        return Object.assign([], result.default);
    }
    catch {
        throw new Error(`Unable to parse packf ${packf}.`);
    }
}
export async function parse(origin: string): Promise<Packet> {
    // Parses chunks
    const chunks = origin.split(";;").map((chunk) => chunk.split(";"));
    const values = chunks[0] ?? [];
    const flags = new Set(chunks[1] ?? []);
    
    // Parses values
    if(values.length < 2) throw new Error(`Invalid origin ${glow(origin)}, expects ${glow("$METHOD;$LABEL")}.`);
    const [ method, label, ...parameters ] = values;
    
    // Interprets method
    switch(method) {
        case "assume": {
            // Parses parameters
            if(parameters.length < 0) throw new Error(`Invalid origin ${glow(origin)}, expects ${glow("assume;$LABEL")}.`);
            const [] = parameters;

            // Creates packet
            const assumePacket: AssumePacket = {
                flags: flags,
                label: label,
                method: "assume",
                origin: origin
            };
            return assumePacket;
        }
        case "direct": {
            // Parses parameters
            if(parameters.length < 2) throw new Error(`Invalid origin ${glow(origin)}, expects ${glow("direct;$LABEL;$URL;$FILE")}.`);
            const [ url, file ] = parameters;

            // Creates packet
            const directPacket: DirectPacket = {
                file: file,
                flags: flags,
                label: label,
                method: "direct",
                origin: origin,
                url: url
            };
            return directPacket;
        }
        case "modrinth": {
            // Parses parameters
            if(parameters.length < 2) throw new Error(`Invalid origin ${glow(origin)}, expects ${glow("modrinth;$LABEL;$PLATFORM;$VERSION")}.`);
            const [ platform, version ] = parameters;

            // Creates respones
            const response = await modrinth(`project/${label}/version?loaders=["${platform}"]&game_versions=["${version}"]`);
            if(!response.ok) throw new Error(`Could not find origin ${glow(origin)} on Modrinth.`);
            
            // Parses respones
            const modrinthVersions = (await response.json() as ModrinthVersion[])
                .filter((modrinthVersion) => modrinthVersion.files.length > 0)
                .sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published));
            if(modrinthVersions.length === 0) throw new Error(`Origin ${glow(origin)} contains no supported results on Modrinth.`);
            const modrinthVersion = modrinthVersions[0];
            const modrinthFile = modrinthVersion.files.find((file) => file.primary) ?? modrinthVersion.files[0];
            
            // Creates packet
            const modrinthPacket: ModrinthPacket = {
                avoids: modrinthVersion.dependencies
                    .filter((dependency) => dependency.dependency_type === "incompatible" && dependency.project_id !== null)
                    .map((dependency) => dependency.project_id!),
                date: +new Date(modrinthVersion.date_published),
                file: modrinthFile.filename,
                flags: flags,
                hash: modrinthFile.hashes.sha512,
                label: label,
                method: "modrinth",
                needs: modrinthVersion.dependencies
                    .filter((dependency) => dependency.dependency_type === "required" && dependency.project_id !== null)
                    .map((dependency) => dependency.project_id!),
                origin: origin,
                platforms: modrinthVersion.loaders,
                project: modrinthVersion.project_id,
                revision: modrinthVersion.id,
                size: modrinthFile.size,
                url: modrinthFile.url,
                versions: modrinthVersion.game_versions,
                wants: modrinthVersion.dependencies
                    .filter((dependency) => dependency.dependency_type === "optional" && dependency.project_id !== null)
                    .map((dependency) => dependency.project_id!),
            };
            return modrinthPacket;
        }
        default: {
            // Throws error
            throw new Error(`Invalid origin ${glow(origin)}, unknown method ${glow(method)}.`);
        }
    }
}

// Defines action api
export async function scan(packet: Packet, labels: Set<string>): Promise<void> {
    switch(packet.method) {
        case "assume": {
            // Prints alert
            const assumePacket = packet as AssumePacket;
            hint(`Origin ${glow(assumePacket.origin)} cannot be scanned.`);
            break;
        }
        case "direct": {
            // Prints alert
            const directPacket = packet as DirectPacket;
            hint(`Origin ${glow(directPacket.origin)} cannot be scanned.`);
            break;
        }
        case "modrinth": {
            // Creates helper
            const slugs = async (ids: string[]): Promise<string[]> => {
                // Resolves ids
                return await resolve(ids.map(async (id) => {
                    // Creates response
                    const response = await modrinth(`project/${id}`);
                    if(!response.ok) throw new Error(`Cannot find project ${glow(id)} on Modrinth.`);
                    
                    // Parses slug
                    const project = await response.json() as ModrinthProject;
                    return project.slug;
                }));
            };

            // Parses slugs
            const modrinthPacket = packet as ModrinthPacket;
            const avoids = await slugs(modrinthPacket.avoids);
            const needs = await slugs(modrinthPacket.needs);
            const wants = await slugs(modrinthPacket.wants);

            // Prints satisfied
            const satisfied = avoids.every((avoid) => !labels.has(avoid)) && needs.every((need) => labels.has(need));
            if(satisfied) good(`Origin ${glow(modrinthPacket.origin)} is satisfied.`);
            else bad(`Origin ${glow(modrinthPacket.origin)} is not satisfied.`);

            // Prints tree
            needs.forEach((need) => {
                if(labels.has(need)) pass(`Dependency ${glow(need)} is required and is found.`, 1);
                else fail(`Dependency ${glow(need)} is required but is not found.`, 1);
            });
            avoids.forEach((avoid) => {
                if(labels.has(avoid)) fail(`Dependency ${glow(avoid)} is a source of conflict but is found.`, 1);
                else pass(`Dependency ${glow(avoid)} is a source of conflict and is not found.`, 1);
            });
            wants.forEach((want) => {
                if(labels.has(want)) pass(`Dependency ${glow(want)} is optional and is found.`, 1);
                else note(`Dependency ${glow(want)} is optional but is not found.`, 1);
            })
            break;
        }
        default: {
            // Throws error
            throw new Error(`Invalid origin ${glow(packet.origin)}, unknown method ${glow(packet.method)}.`);
        }
    }
}
export async function sync(packet: Packet): Promise<void> {
    // Checks flags
    if(packet.flags.has("no-sync")) {
        hint(`Origin ${glow(packet.origin)} is marked ${glow("no-sync")}.`);
        return;
    }

    // Syncs packet
    switch(packet.method) {
        case "assume": {
            // Prints status
            const assumePacket = packet as AssumePacket;
            hint(`Origin ${glow(assumePacket.origin)} is assumed to exist.`);
            break;
        }
        case "direct": {
            // Creates response
            const directPacket = packet as DirectPacket;
            const response = await fetch(directPacket.url);
            if(!response.ok) throw new Error(`Origin ${glow(directPacket.origin)} leads to a corrupted URL.`);

            // Syncs file
            const bytes = await response.bytes();
            const file = Bun.file(nodePath.resolve(packd, directPacket.file));
            await file.write(bytes);

            // Prints status
            const size = Math.floor(bytes.length / 1024 / 1024 * 100) / 100;
            good(`Successfully synced origin ${glow(directPacket.origin)}, download size ${glow(size)} MiB.`);
            break;
        }
        case "modrinth": {
            // Creates response
            const modrinthPacket = packet as ModrinthPacket;
            const response = await fetch(modrinthPacket.url);
            if(!response.ok) throw new Error(`Origin ${glow(modrinthPacket.origin)} leads to a corrupted URL.`);

            // Syncs file
            const bytes = await response.bytes();
            const file = Bun.file(nodePath.resolve(packd, modrinthPacket.file));
            await file.write(bytes);
            
            // Checks hash
            const hash = new Bun.CryptoHasher("sha512").update(Buffer.from(bytes)).digest("hex");
            if(hash !== modrinthPacket.hash) {
                await file.delete();
                throw new Error(`Origin ${glow(modrinthPacket.origin)} leads to a corrupted file.`);
            }

            // Prints status
            const size = Math.floor(modrinthPacket.size / 1024 / 1024 * 100) / 100;
            good(`Successfully synced origin ${glow(modrinthPacket.origin)}, download size ${glow(size)} MiB.`);
            break;
        }
        default: {
            // Throws error
            throw new Error(`Invalid origin ${glow(packet.origin)}, unknown method ${glow(packet.method)}.`);
        }
    }
}
export async function test(packet: Packet): Promise<void> {
    switch(packet.method) {
        case "assume": {
            // Prints status
            const assumePacket = packet as AssumePacket;
            hint(`Origin ${glow(assumePacket.origin)} cannot be tested.`);
            break;
        }
        case "direct": {
            // Creates response
            const directPacket = packet as DirectPacket;
            const response = await fetch(directPacket.url, {
                method: "HEAD"
            });
            
            // Prints status
            if(response.ok) good(`Origin ${glow(directPacket.origin)} is reachable.`);
            else bad(`Origin ${glow(directPacket.origin)} is not reachable.`);
            break;
        }
        case "modrinth": {
            // Creates response
            const modrinthPacket = packet as ModrinthPacket;
            const response = await fetch(modrinthPacket.url, {
                method: "HEAD"
            });
            
            // Prints status
            if(response.ok) good(`Origin ${glow(modrinthPacket.origin)} is reachable.`);
            else bad(`Origin ${glow(modrinthPacket.origin)} is not reachable.`);
            break;
        }
        default: {
            // Throws error
            throw new Error(`Invalid origin ${glow(packet.origin)}, unknown method ${glow(packet.method)}.`);
        }
    }
}
