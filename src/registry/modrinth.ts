// Imports
import nodeAssert from "node:assert";
import { format } from "../core/errors";
import { MinecraftAddonFlavor } from "../core/flavor";
import { MinecraftAddonRegistry } from "../core/registries";
import { MinecraftAddonUpstream } from "../core/upstream";
import { version as semver } from "../../package.json";

/** The Modrinth registry. */
export class ModrinthRegistry {
    /** The base Modrinth API url. */
    static readonly API = "https://api.modrinth.com/v2";
    /** The user agent for gsmc-pack. */
    static readonly USER_AGENT = `DmmDGM/gsmc-pack/${semver} (dmmdgm@dmmdgm.dev)`;
    /** The default number of retries available in case of a rate limit violation. */
    static readonly DEFAULT_RETRIES = 3;
    /** The default time in milliseconds to wait in case of a rate limit violation. */
    static readonly DEFAULT_TIMEOUT = 1000;

    /**
     * Creates an URL to Modrinth API from a given endpoint.
     * @param endpoint The Modrinth API endpoint.
     * @returns The built Modrinth API URL.
     */
    static createBaseURL(endpoint: string): URL {
        // Creates Modrinth API URL
        return new URL(ModrinthRegistry.API + endpoint);
    }

    /**
     * Creates a GET request to Modrinth API from a given URL.
     * @param url The Modrinth API url.
     * @param retry The number of retries available in case of a rate limit violation.
     * @param timeout The time in milliseconds to wait in case of a rate limit violation.
     * @returns The response from Modrinth API.
     */
    static async createGetRequest(url: URL, retry: number = ModrinthRegistry.DEFAULT_RETRIES, timeout: number = ModrinthRegistry.DEFAULT_TIMEOUT): Promise<Response> {
        // Ensures Modrinth API origin
        nodeAssert(url.href.startsWith(ModrinthRegistry.API), format("MODRINTH:REQUEST_NO_EXTERNAL_URL", { url: url.toString() }));
        
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
        nodeAssert(false, format("MODRINTH:REQUEST_RATE_LIMIT_TIMEOUT", { url: url.toString() }));
    }

    /**
     * Fetches the Modrinth upstream from an addon's file hash.
     * @param hash The file hash of the addon.
     * @returns The Modrinth upstream of the addon.
     */
    static async fetchUpstreamFromFileHash(hash: string): Promise<MinecraftAddonUpstream> {
        // Creates request URL
        const url = ModrinthRegistry.createBaseURL(`/version_file/${hash}`);
        
        // Awaits response from Modrinth
        const response = await ModrinthRegistry.createGetRequest(url);
        nodeAssert(response.ok, format("MODRINTH:UPSTREAM_NO_SUCH_FILE_HASH", { hash }));
        
        // Parses project from response
        const project = await response.json() as {
            date_published: string;
            files: {
                filename: string;
                hashes: {
                    sha1: string;
                };
                primary: boolean;
                url: string;
            }[];
            project_id: string;
            version_number: string;
        };

        // Parses file from project
        const file = project.files.find((file) => file.primary) || project.files[0];

        // Returns upstream
        return {
            date: +new Date(project.date_published),
            file: file.filename,
            hash: file.hashes.sha1,
            major: project.project_id,
            minor: project.version_number,
            registry: MinecraftAddonRegistry.MODRINTH,
            url: file.url
        };
    }

    /**
     * Fetches the Modrinth minor upstreams from an addon's major.
     * @param major The major of the addon.
     * @param flavor The flavor of the addon.
     * @param minecraft The Minecraft version of the addon.
     * @returns The Modrinth upstreams of the addon.
     */
    static async fetchMinorUpstreamsFromMajor(major: string, flavor: MinecraftAddonFlavor, minecraft: string): Promise<MinecraftAddonUpstream[]> {
        // Translates addon flavor to Modrinth-parsable loader
        const loaders = {
            [ MinecraftAddonFlavor.FABRIC ]: "fabric",
            [ MinecraftAddonFlavor.FORGE ]: "forge",
            [ MinecraftAddonFlavor.NEO_FORGE ]: "neoforge",
            [ MinecraftAddonFlavor.UNKNOWN ]: "unknown",
            [ MinecraftAddonFlavor.VANILLA ]: "minecraft"
        };
        nodeAssert(flavor in loaders, format("MODRINTH:UPSTREAM_INVALID_ADDON_FLAVOR", { flavor, major }));
        const loader = loaders[flavor as keyof typeof loaders];
        
        // Creates request URL
        const url = ModrinthRegistry.createBaseURL(`/project/${major}/version`);
        if(flavor !== MinecraftAddonFlavor.UNKNOWN) url.searchParams.append("loaders", JSON.stringify([ loader ]));
        url.searchParams.append("game_versions", JSON.stringify([ minecraft ]));
        url.searchParams.append("include_changelog", JSON.stringify(false));
        
        // Awaits response from Modrinth
        const response = await ModrinthRegistry.createGetRequest(url);
        nodeAssert(response.ok, format("MODRINTH:UPSTREAM_NO_SUCH_UPSTREAM_MAJOR", { major }));

        // Parses versions from response
        const versions = await response.json() as {
            date_published: string;
            files: {
                filename: string;
                hashes: {
                    sha1: string;
                };
                primary: boolean;
                url: string;
            }[];
            project_id: string;
            version_number: string;
        }[];

        // Returns upstreams
        return versions.map((version) => {
            const file = version.files.find((file) => file.primary) || version.files[0];
            return {
                date: +new Date(version.date_published),
                file: file.filename,
                hash: file.hashes.sha1,
                major: version.project_id,
                minor: version.version_number,
                registry: MinecraftAddonRegistry.MODRINTH,
                url: file.url,
            };
        });
    }
}
