// Imports
import fingerprinter from "@meza/curseforge-fingerprint";
import {
    error,
    GSMCPACK_BUILD,
    MINECRAFT_LOADER_TYPE_MAP,
    MinecraftLoaderEnum,
    MinecraftRegistryEnum,
    MinecraftTypeEnum
} from "../common";
import { readCurseForgeAPIKey } from "../config";
import MinecraftRegistry from "../minecraft-registry";

/** CurseForge registry. */
export default class CurseForgeRegistry extends MinecraftRegistry {
    /** CurseForge registry. */
    readonly registry = MinecraftRegistryEnum.CURSEFORGE;

    /**
     * Creates GET request to API.
     * @param url URL object.
     * @returns API response.
     */
    private async createGetRequest(url: URL): Promise<Response> {
        // Creates headers
        const headers = new Headers();
        headers.append("accept", "application/json");
        headers.append("user-agent", `DmmDGM/gsmc-pack/${GSMCPACK_BUILD} (dmmdgm@dmmdgm.dev)`);
        headers.append("x-api-key", await readCurseForgeAPIKey());

        // Makes request
        for(let i = 0; i < 5; i++) {
            const response = await fetch(url, { headers });
            if(response.status === 429) {
                await Bun.sleep(1000);
                continue;
            }
            return response;
        }

        // Throws timeout error
        throw new Error(error("REGISTRY_TIMED_OUT"));
    }

    /**
     * Creates POST request to API.
     * @param url URL object.
     * @param payload Request payload.
     * @returns API response.
     */
    private async createPostRequest(url: URL, payload: unknown): Promise<Response> {
        // Creates headers
        const headers = new Headers();
        headers.append("accept", "application/json");
        headers.append("content-type", "application/json");
        headers.append("user-agent", `DmmDGM/gsmc-pack/${GSMCPACK_BUILD} (dmmdgm@dmmdgm.dev)`);
        headers.append("x-api-key", await readCurseForgeAPIKey());

        // Creates body
        const body = JSON.stringify(payload);

        // Creates method
        const method = "POST";
        
        // Makes request
        for(let i = 0; i < 5; i++) {
            const response = await fetch(url, { body, headers, method });
            if(response.status === 429) {
                await Bun.sleep(1000);
                continue;
            }
            return response;
        }

        // Throws timeout error
        throw new Error(error("REGISTRY_TIMED_OUT"));
    }

    /**
     * Fetches unique ID from unique slug.
     * @param slug Unique slug.
     * @returns Unique ID.
     */
    async fetchIDFromSlug(slug: string): Promise<string> {
        // Creates URL
        const url = new URL("https://api.curseforge.com/v1/mods/search");
        url.searchParams.append("gameId", JSON.stringify(432));
        url.searchParams.append("slug", slug);

        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const { data } = await response.json() as {
            data: {
                id: number;
                slug: string;
            }[];
        };

        // Returns ID
        const match = data.find((entry) => entry.slug === slug);
        if(typeof match === "undefined") throw new Error(error("REGISTRY_BAD_RESPONSE", { code: 404 }));
        return match.id.toString();
    }

    /**
     * Fetches upstream string from soruce file.
     * @param source Source file.
     * @returns Upstream string.
     */
    async fetchUpstreamFromSource(source: Bun.BunFile): Promise<string> {
        // Fingerprints source
        const fingerprint = fingerprinter.fingerprint(source.name!);
        
        // Creates URL
        const url = new URL("https://api.curseforge.com/v1/fingerprints");

        // Makes request
        const response = await this.createPostRequest(url, { fingerprints: [ fingerprint ]});
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const { data: { exactMatches: matches } } = await response.json() as {
            data: {
                exactMatches: {
                    id: number;
                    file: {
                        downloadUrl: string | null;
                        gameVersions: string[];
                        hashes: {
                            algo: number;
                            value: string;
                        }[];
                        id: number;
                        modules: {
                            name: string;
                        }[];
                    };
                }[];
            };
        };
        if(matches.length === 0) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: 404 }));

        // Returns upstream string
        const match = matches[0];
        const hash = match.file.hashes.find((hash) => hash.algo === 1)!;
        const { loaders, types } = this.inferUpstreamEnvironment(match.file.modules);
        return MinecraftRegistry.dumpUpstream({
            hash: hash.value,
            id: match.id.toString(),
            loaders: loaders,
            minecrafts: match.file.gameVersions,
            registry: this.registry,
            tag: match.file.id.toString(),
            types: types,
            url: match.file.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${match.id}/files/${match.file.id}/download`
        });
    }

    /**
     * Fetches upstream string from unique tag.
     * @param id Unique ID.
     * @param tag Unique tag.
     * @returns Upstream string.
     */
    async fetchUpstreamFromTag(id: string, tag: string): Promise<string> {
        // Creates URL
        const url = new URL(`https://api.curseforge.com/v1/mods/${id}/files/${tag}`);

        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const { data } = await response.json() as {
            data: {
                downloadUrl: string | null;
                gameVersions: string[];
                hashes: {
                    algo: number;
                    value: string;
                }[];
                id: number;
                modId: number;
                modules: {
                    name: string;
                }[];
            };
        };

        // Returns upstream string
        const hash = data.hashes.find((hash) => hash.algo === 1)!;
        const { loaders, types } = this.inferUpstreamEnvironment(data.modules);
        return MinecraftRegistry.dumpUpstream({
            hash: hash.value,
            id: data.modId.toString(),
            loaders: loaders,
            minecrafts: data.gameVersions,
            registry: this.registry,
            tag: data.id.toString(),
            types: types,
            url: data.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${data.modId}/files/${data.id}/download`
        });
    }

    /**
     * Fetches upstream strings from unique ID.
     * @param minecraft Minecraft version.
     * @param id Unique ID.
     * @returns Upstream strings.
     */
    async fetchUpstreamsFromID(minecraft: string, id: string): Promise<string[]> {
        // Creates URL
        const url = new URL(`https://api.curseforge.com/v1/mods/${id}/files`);
        url.searchParams.append("gameVersion", minecraft);

        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const { data } = await response.json() as {
            data: {
                downloadUrl: string | null;
                fileDate: string;
                gameVersions: string[];
                hashes: {
                    algo: number;
                    value: string;
                }[];
                id: number;
                modId: number;
                modules: {
                    name: string;
                }[];
            }[];
        };
        
        // Returns upstream strings
        return data.map((entry) => {
            const hash = entry.hashes.find((hash) => hash.algo === 1)!;
            const { loaders, types } = this.inferUpstreamEnvironment(entry.modules);
            return MinecraftRegistry.dumpUpstream({
                hash: hash.value,
                id: entry.modId.toString(),
                loaders: loaders,
                minecrafts: entry.gameVersions,
                registry: this.registry,
                types: types,
                tag: entry.id.toString(),
                url: entry.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${entry.modId}/files/${entry.id}/download`
            });
        });
    }

    /**
     * Infers upstream environment from registry data.
     * @param metafiles Addon metafiles from CurseForge.
     * @returns Upstream environment.
     */
    private inferUpstreamEnvironment(metafiles: { name: string; }[]): {
        loaders: MinecraftLoaderEnum[];
        types: MinecraftTypeEnum[];
    } {
        // Infers loaders
        const loaders = new Set<MinecraftLoaderEnum>();
        for(const metafile of metafiles) {
            switch(metafile.name) {
                case "fabric.mod.json": {
                    loaders.add(MinecraftLoaderEnum.FABRIC);
                    break;
                }
                case "mods.toml": {
                    loaders.add(MinecraftLoaderEnum.FORGE);
                    break;
                }
                case "neoforge.mods.toml": {
                    loaders.add(MinecraftLoaderEnum.NEOFORGE);
                    break;
                }
                case "pack.mcmeta": {
                    if(metafiles.some((submetafile) => submetafile.name === "data")) {
                        loaders.add(MinecraftLoaderEnum.DATAPACK);
                        break;
                    }
                    if(metafiles.some((submetafile) => submetafile.name === "assets")) {
                        loaders.add(MinecraftLoaderEnum.RESOURCEPACK);
                        break;
                    }
                    break;
                }
                case "paper-plugin.yml": {
                    loaders.add(MinecraftLoaderEnum.PAPER);
                    break;
                }
                case "plugin.yml": {
                    loaders.add(MinecraftLoaderEnum.BUKKIT);
                    loaders.add(MinecraftLoaderEnum.PAPER);
                    loaders.add(MinecraftLoaderEnum.PURPUR);
                    loaders.add(MinecraftLoaderEnum.SPIGOT);
                    break;
                }
                case "shaders": {
                    loaders.add(MinecraftLoaderEnum.IRIS);
                    loaders.add(MinecraftLoaderEnum.OPTIFINE);
                    break;
                }
                case "quilt.mod.json": {
                    loaders.add(MinecraftLoaderEnum.QUILT);
                    break;
                }
            }
        }

        // Infers types
        const types = new Set<MinecraftTypeEnum>();
        for(const loader of loaders) {
            switch(MINECRAFT_LOADER_TYPE_MAP[loader]) {
                case MinecraftTypeEnum.DATAPACK: {
                    types.add(MinecraftTypeEnum.DATAPACK);
                    break;
                }
                case MinecraftTypeEnum.MOD: {
                    types.add(MinecraftTypeEnum.MOD);
                    break;
                }
                case MinecraftTypeEnum.PLUGIN: {
                    types.add(MinecraftTypeEnum.PLUGIN);
                    break;
                }
                case MinecraftTypeEnum.RESOURCEPACK: {
                    types.add(MinecraftTypeEnum.RESOURCEPACK);
                    break;
                }
                case MinecraftTypeEnum.SHADERPACK: {
                    types.add(MinecraftTypeEnum.SHADERPACK);
                    break;
                }
            }
        }
        
        // Returns environment
        return { loaders: Array.from(loaders), types: Array.from(types) };
    }
}
