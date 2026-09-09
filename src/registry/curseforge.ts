// Imports
import nodeAssert from "node:assert";
import { format, MinecraftUpstream, readCurseForgeAPIKey } from "../core/common";
import { version } from "../../package.json";

/** The CurseForge registry. */
export class CurseForgeRegistry {
    /** The base CurseForge API url. */
    static readonly API = "https://api.curseforge.com/v1";
    /** The user agent for gsmc-pack. */
    static readonly USER_AGENT = `DmmDGM/gsmc-pack/${version} (dmmdgm@dmmdgm.dev)`;
    /** The default number of retries available in case of a rate limit violation. */
    static readonly DEFAULT_RETRIES = 3;
    /** The default time in milliseconds to wait in case of a rate limit violation. */
    static readonly DEFAULT_TIMEOUT = 1000;

    /**
     * Creates an URL to CurseForge API from a given endpoint.
     * @param endpoint The CurseForge API endpoint.
     * @returns The built CurseForge API URL.
     */
    static createBaseURL(endpoint: string): URL {
        // Creates CurseForge API URL
        return new URL(CurseForgeRegistry.API + endpoint);
    }

    /**
     * Creates a GET request to CurseForge API from a given URL.
     * @param url The CurseForge API url.
     * @param retry The number of retries available in case of a rate limit violation.
     * @param timeout The time in milliseconds to wait in case of a rate limit violation.
     * @returns The response from CurseForge API.
     */
    static async createGetRequest(url: URL, retry: number = CurseForgeRegistry.DEFAULT_RETRIES, timeout: number = CurseForgeRegistry.DEFAULT_TIMEOUT): Promise<Response> {
        // Ensures CurseForge API origin
        nodeAssert(url.href.startsWith(CurseForgeRegistry.API), format("CURSE_FORGE:REQUEST_EXTERNAL_URL", { url: url.toString() }));

        // Creates fetch headers
        const headers = new Headers();
        headers.append("user-agent", CurseForgeRegistry.USER_AGENT);
        headers.append("accept", "application/json");
        headers.append("x-api-key", await readCurseForgeAPIKey());

        // Creates fetch request
        for(let i = 0; i < retry; i++) {
            // Awaits CurseForge response
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
        nodeAssert(false, format("CURSE_FORGE:RESPONSE_RATE_LIMIT_TIMEOUT", { url: url.toString() }));
    }

    /**
     * Creates a POST request to CurseForge API from a given URL.
     * @param url The CurseForge API url.
     * @param retry The number of retries available in case of a rate limit violation.
     * @param timeout The time in milliseconds to wait in case of a rate limit violation.
     * @returns The response from CurseForge API.
     */
    static async createPostRequest(url: URL, payload: unknown, retry: number = CurseForgeRegistry.DEFAULT_RETRIES, timeout: number = CurseForgeRegistry.DEFAULT_TIMEOUT): Promise<Response> {
        // Ensures CurseForge API origin
        nodeAssert(url.href.startsWith(CurseForgeRegistry.API), format("CURSE_FORGE:REQUEST_EXTERNAL_URL", { url: url.toString() }));

        // Creates fetch headers
        const headers = new Headers();
        headers.append("user-agent", CurseForgeRegistry.USER_AGENT);
        headers.append("content-type", "application/json");
        headers.append("accept", "application/json");
        headers.append("x-api-key", await readCurseForgeAPIKey());

        // Creates fetch body
        const body = JSON.stringify(payload);

        // Creates fetch method
        const method = "POST";

        // Creates fetch request
        for(let i = 0; i < retry; i++) {
            // Awaits CurseForge response
            const response = await fetch(url, { body, headers, method });
            
            // Resolves rate limit if necessary
            if(response.status === 429) {
                await Bun.sleep(timeout);
                continue;
            }

            // Returns response
            return response;
        }

        // Throws error
        nodeAssert(false, format("CURSE_FORGE:RESPONSE_RATE_LIMIT_TIMEOUT", { url: url.toString() }));
    }

    /**
     * Fetches a mod's CurseForge upstream from its file fingerprint.
     * @param fingerprint The file fingerprint of the mod.
     * @returns The CurseForge upstream of this mod.
     */
    static async fetchUpstreamFromFileFingerprint(fingerprint: number): Promise<MinecraftUpstream> {
        // Retrieves response from CurseForge
        const url = CurseForgeRegistry.createBaseURL("/fingerprints");
        const response = await CurseForgeRegistry.createPostRequest(url, {
            fingerprints: [ fingerprint ]
        });
        nodeAssert(response.ok, format("CURSE_FORGE:NO_SUCH_FILE_FINGERPRINT", { fingerprint }));
        
        // Parses relevant fields from response
        const { data: { exactMatches: matches } } = await response.json() as {
            data: {
                exactMatches: {
                    id: number;
                    file: {
                        downloadUrl: string;
                        fileDate: string;
                        fileName: string;
                        hashes: {
                            algo: number;
                            value: string;
                        }[];
                        id: number;
                    };
                }[];
            };
        };
        nodeAssert(matches.length > 0, format("CURSE_FORGE:NO_SUCH_FILE_FINGERPRINT", { fingerprint }));
        const match = matches[0];
        const hash = match.file.hashes.find((hash) => hash.algo === 1);
        nodeAssert(typeof hash !== "undefined", format("CURSE_FORGE:MISSING_FILE_HASH", { fingerprint }));
        return {
            date: +new Date(match.file.fileDate),
            file: match.file.fileName,
            hash: hash.value,
            id: match.id.toString(),
            url: match.file.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${match.id}/files/${match.file.id}/download`,
            version: match.file.id.toString()
        };
    }

    static async fetchUpstreamsFromModID(id: number): Promise<MinecraftUpstream[]> {
        // Retrieves response from CurseForge
        const url = CurseForgeRegistry.createBaseURL(`/mods/${id}/files`);
        const response = await CurseForgeRegistry.createGetRequest(url);
        nodeAssert(response.ok, format("CURSE_FORGE:NO_SUCH_MOD_ID", { id }));
        
        // Parses relevant fields from response
        const { data: mods } = await response.json() as {
            data: {
                downloadUrl: string;
                fileDate: string;
                fileName: string;
                hashes: {
                    algo: number;
                    value: string;
                }[];
                id: number;
                modId: number;
            }[];
        };
        nodeAssert(mods.length > 0, format("CURSE_FORGE:NO_SUCH_MOD_ID", { id }));
        return mods.map((mod) => {
            const hash = mod.hashes.find((hash) => hash.algo === 1);
            nodeAssert(typeof hash !== "undefined", format("CURSE_FORGE:MISSING_FILE_HASH", { id }));
            return {
                date: +new Date(mod.fileDate),
                file: mod.fileName,
                hash: hash.value,
                id: mod.id.toString(),
                url: mod.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${mod.modId}/files/${mod.id}/download`,
                version: mod.id.toString()
            };
        });
    }
}
