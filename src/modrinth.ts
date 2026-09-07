// Imports
import nodeAssert from "node:assert";
import { _error } from "./core";
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
     * Fetches the Modrinth project ID from a mod's file hash.
     * @param hash The mod's file hash.
     * @returns The equivalent project ID from Modrinth.
     */
    static async fetchProjectIDFromFileHash(hash: string): Promise<string> {
        // Retrieves response from Modrinth
        const url = ModrinthRegistry.createBaseURL(`/version_file/${hash}`);
        const response = await ModrinthRegistry.createGetRequest(url);
        
        // Parses 'project_id' field from data
        const data = await response.json();
        nodeAssert("project_id" in data, _error("MODRINTH:MISSING_FILE_HASH", { hash }));
        return data["project_id"];
    }
}
