// Imports
import nodeAssert from "node:assert";
import { _error, MinecraftModFlavor } from "./common";
import { version } from "../package.json";

/** The Modrinth registry. */
export class ModrinthRegistry {
    /** The base Modrinth API url. */
    static readonly API = "https://api.modrinth.com/v2"
    /** The user agent for gsmc-pack. */
    static readonly USER_AGENT = `DmmDGM/gsmc-pack/${version} (dmmdgm@dmmdgm.dev)`;
    /** The default number of retries available in case of a rate limit violation. */
    static readonly DEFAULT_RETRIES = 3;
    /** The default time in milliseconds to wait in case of a rate limit violation. */
    static readonly DEFAULT_TIMEOUT = 1000;

    /**
     * Creates an URL to Modrinth API from a given endpoint.
     * @param endpoint 
     * @returns 
     */
    static createBaseURL(endpoint: string): URL {
        // Creates Modrinth API URL
        return new URL(ModrinthRegistry.API + endpoint);
    }

    /**
     * Creates a get request to Modrinth API from a given URL.
     * @param url The Modrinth API url.
     * @param retry The number of retries available in case of a rate limit violation.
     * @param timeout The time in milliseconds to wait in case of a rate limit violation.
     * @returns The response from Modrinth API.
     */
    static async createGetRequest(url: URL, retry: number = ModrinthRegistry.DEFAULT_RETRIES, timeout: number = ModrinthRegistry.DEFAULT_TIMEOUT): Promise<Response> {
        // Ensures Modrinth API origin
        nodeAssert(url.href.startsWith(ModrinthRegistry.API), _error("MODRINTH:REQUEST_EXTERNAL_URL", { url: url.toString() }));
        
        // Creates fetch headers
        const headers = new Headers();
        headers.append("user-agent", ModrinthRegistry.USER_AGENT);

        // Creates fetch request
        for(let i = 0; i < retry; i++) {
            // Awaits Modrinth response
            const response = await fetch(url, { headers });
            
            // Resolves rate limit if necessary
            if(response.status === 429) {
                await Bun.sleep(timeout);
                continue;
            }

            // Returns response
            return response;
        }

        // Throws error
        nodeAssert(false, _error("MODRINTH:RESPONSE_RATE_LIMIT_TIMEOUT", { url: url.toString() }));
    }

    /**
     * Fetches a mod's Modrinth project ID from its file hash.
     * @param hash The file hash of the mod.
     * @returns The Modrinth project ID of this mod.
     */
    static async fetchProjectIDFromFileHash(hash: string): Promise<string> {
        // Retrieves response from Modrinth
        const url = ModrinthRegistry.createBaseURL(`/version_file/${hash}`);
        const response = await ModrinthRegistry.createGetRequest(url);
        nodeAssert(response.ok, _error("MODRINTH:NO_SUCH_FILE_HASH", { hash }));
        
        // Parses 'project_id' field from data
        const data = await response.json() as {
            project_id: string;
        };
        return data["project_id"];
    }

    /**
     * Fetches a mod's Modrinth releases from its project ID.
     * @param id The project ID of the mod.
     * @param flavor The flavor of the mod.
     * @param version The version of the Minecraft instance.
     * @returns The Modrinth releases of this mod.
     */
    static async fetchVersionsFromProjectID(id: string, flavor: MinecraftModFlavor, version: string): Promise<{
        date: number;
        hash: string;
        name: string;
        path: string;
        url: string;
        version: string;   
    }[]> {
        // Translates mod flavor to Modrinth-parsable loader
        const loader = {
            [ MinecraftModFlavor.FABRIC ]: "fabric",
            [ MinecraftModFlavor.FORGE ]: "forge",
            [ MinecraftModFlavor.NEO_FORGE ]: "neoforge"
        }[flavor];
        
        // Retrieves response from Modrinth
        const url = ModrinthRegistry.createBaseURL(`/project/${id}/version`);
        url.searchParams.append("loaders", JSON.stringify([ loader ]));
        url.searchParams.append("game_versions", JSON.stringify([ version ]));
        url.searchParams.append("include_changelog", JSON.stringify(false));
        const response = await ModrinthRegistry.createGetRequest(url);
        nodeAssert(response.ok, _error("MODRINTH:NO_SUCH_PROJECT_ID", { id }));

        // Parses relevant fields from data
        const data = await response.json() as {
            date_published: string;
            files: {
                filename: string;
                hashes: {
                    sha1: string;
                };
                primary: boolean;
                url: string;
            }[];
            name: string;
            version_number: string;
        }[];
        return data
            .filter((version) => version.files.length > 0)
            .map((version) => {
                const file = version.files.find((file) => file.primary) || version.files[0];
                return {
                    date: +new Date(version.date_published),
                    hash: file.hashes.sha1,
                    name: version.name,
                    path: file.filename,
                    url: file.url,
                    version: version.version_number
                };
            })
            .sort((a, b) => b.date - a.date);
    }
}
