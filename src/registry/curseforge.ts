// Imports
import nodeAssert from "node:assert";
import { format } from "../core/errors";
import { readCurseForgeAPIKey } from "../core/config";
import { MinecraftAddonFlavor } from "../core/flavor";
import { MinecraftAddonRegistry } from "../core/registries";
import { MinecraftAddonUpstream } from "../core/upstream";
import { version as semver } from "../../package.json";

/** The CurseForge registry. */
export class CurseForgeRegistry {
    /** The base CurseForge API url. */
    static readonly API = "https://api.curseforge.com/v1";
    /** The user agent for gsmc-pack. */
    static readonly USER_AGENT = `DmmDGM/gsmc-pack/${semver} (dmmdgm@dmmdgm.dev)`;
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
        nodeAssert(url.href.startsWith(CurseForgeRegistry.API), format("CURSE_FORGE:REQUEST_NO_EXTERNAL_URL", { url: url.toString() }));
        
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
        nodeAssert(false, format("CURSE_FORGE:REQUEST_RATE_LIMIT_TIMEOUT", { url: url.toString() }));
    }

    /**
     * Creates a POST request to CurseForge API from a given URL.
     * @param url The CurseForge API url.
     * @param payload The payload of the request.
     * @param retry The number of retries available in case of a rate limit violation.
     * @param timeout The time in milliseconds to wait in case of a rate limit violation.
     * @returns The response from CurseForge API.
     */
    static async createPostRequest(url: URL, payload: unknown, retry: number = CurseForgeRegistry.DEFAULT_RETRIES, timeout: number = CurseForgeRegistry.DEFAULT_TIMEOUT): Promise<Response> {
        // Ensures CurseForge API origin
        nodeAssert(url.href.startsWith(CurseForgeRegistry.API), format("CURSE_FORGE:REQUEST_NO_EXTERNAL_URL", { url: url.toString() }));
        
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
        nodeAssert(false, format("CURSE_FORGE:REQUEST_RATE_LIMIT_TIMEOUT", { url: url.toString() }));
    }

    /**
     * Fetches the CurseForge upstream from an addon's file fingerprint.
     * @param fingerprint The file fingerprint of the addon.
     * @returns The CurseForge upstream of the addon.
     */
    static async fetchUpstreamFromFileFingerprint(fingerprint: number): Promise<MinecraftAddonUpstream> {
        // Creates request URL
        const url = CurseForgeRegistry.createBaseURL("/fingerprints");
        
        // Awaits response from CurseForge
        const response = await CurseForgeRegistry.createPostRequest(url, {
            fingerprints: [ fingerprint ]
        });
        nodeAssert(response.ok, format("CURSE_FORGE:UPSTREAM_NO_SUCH_FILE_FINGERPRINT", { fingerprint }));
        
        // Parses matches from response
        const { data: { exactMatches: matches } }= await response.json() as {
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
        nodeAssert(matches.length > 0, format("CURSE_FORGE:UPSTREAM_NO_SUCH_FILE_FINGERPRINT", { fingerprint }));

        // Parses match from matches
        const match = matches[0];

        // Parses hash from match
        const hash = match.file.hashes.find((hash) => hash.algo === 1);
        nodeAssert(typeof hash !== "undefined", format("CURSE_FORGE:UPSTREAM_MISSING_FILE_HASH_FILE_FINGERPRINT", { fingerprint }));

        // Returns upstream
        return {
            date: +new Date(match.file.fileDate),
            file: match.file.fileName,
            hash: hash.value,
            major: match.id.toString(),
            minor: match.file.id.toString(),
            registry: MinecraftAddonRegistry.CURSE_FORGE,
            url: match.file.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${match.id}/files/${match.file.id}/download`
        };
    }

    /**
     * Fetches the CurseForge minor upstreams from an addon's major.
     * @param major The major of the addon.
     * @param flavor The flavor of the addon.
     * @param minecraft The Minecraft version of the addon.
     * @returns The CurseForge upstreams of the addon.
     */
    static async fetchMinorUpstreamsFromMajor(major: string, flavor: MinecraftAddonFlavor, minecraft: string): Promise<MinecraftAddonUpstream[]> {
        // Translates addon flavor to CurseForge-parsable loader
        const loaders = {
            [ MinecraftAddonFlavor.FABRIC ]: 4,
            [ MinecraftAddonFlavor.FORGE ]: 1,
            [ MinecraftAddonFlavor.NEO_FORGE ]: 6
        };
        nodeAssert(flavor in loaders, format("CURSE_FORGE:UPSTREAM_INVALID_ADDON_FLAVOR", { flavor, major }));
        const loader = loaders[flavor as keyof typeof loaders];
        
        // Creates request URL
        const url = CurseForgeRegistry.createBaseURL(`/mods/${major}/files`);
        url.searchParams.append("modLoaderType", JSON.stringify(loader));
        url.searchParams.append("gameVersion", minecraft);
        
        // Awaits response from CurseForge
        const response = await CurseForgeRegistry.createGetRequest(url);
        nodeAssert(response.ok, format("CURSE_FORGE:UPSTREAM_NO_SUCH_UPSTREAM_MAJOR", { major }));

        // Parses files from response
        const { data: files } = await response.json() as {
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
        nodeAssert(files.length, format("CURSE_FORGE:UPSTREAM_NO_SUCH_UPSTREAM_MAJOR", { major }));

        // Returns upstreams
        return files.map((file) => {
            const hash = file.hashes.find((hash) => hash.algo === 1);
            nodeAssert(typeof hash !== "undefined", format("CURSE_FORGE:UPSTREAM_MISSING_FILE_HASH_MAJOR", { major }));
            return {
                date: +new Date(file.fileDate),
                file: file.fileName,
                hash: hash.value,
                major: file.modId.toString(),
                minor: file.id.toString(),
                registry: MinecraftAddonRegistry.CURSE_FORGE,
                url: file.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${file.modId}/files/${file.id}/download`,
            };
        });
    }
}
