// Imports
import fingerprinter from "@meza/curseforge-fingerprint";
import { MinecraftLoaderEnum, MinecraftRegistry, MinecraftRegistryEnum, MinecraftTypeEnum } from "../minecraft-registry";
import { readCurseForgeAPIKey } from "../common/config";
import { error } from "../common/error";
import { version as build } from "../../package.json";

/** CurseForge registry. */
export class CurseForgeRegistry extends MinecraftRegistry {
    /**
     * Creates base URL to API.
     * @param endpoint API endpoint.
     * @returns URL object.
     */
    createBaseURL(endpoint: string): URL {
        // Creates URL
        return new URL("https://api.curseforge.com/v1" + endpoint);
    }

    /**
     * Creates GET request to API.
     * @param url URL object.
     * @returns API response.
     */
    async createGetRequest(url: URL): Promise<Response> {
        // Creates headers
        const headers = new Headers();
        headers.append("user-agent", `DmmDGM/gsmc-pack/${build} (dmmdgm@dmmdgm.dev)`);
        headers.append("accept", "application/json");
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
    async createPostRequest(url: URL, payload: unknown): Promise<Response> {
        // Creates headers
        const headers = new Headers();
        headers.append("user-agent", `DmmDGM/gsmc-pack/${build} (dmmdgm@dmmdgm.dev)`);
        headers.append("content-type", "application/json");
        headers.append("accept", "application/json");
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
     * Fetches ID from slug.
     * @param slug Addon slug.
     * @returns Addon ID.
     */
    async fetchIDFromSlug(slug: string): Promise<string> {
        // Creates URL
        const url = this.createBaseURL("/mods/search");
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
     * @param source Addon source file.
     * @returns Addon upstream string.
     */
    async fetchUpstreamFromSource(source: Bun.BunFile): Promise<string> {
        // Fingerprints source
        const fingerprint = fingerprinter.fingerprint(source.name!);
        
        // Creates URL
        const url = this.createBaseURL("/fingerprints");

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
        const [ types, loaders ] = this.inferUpstreamEnvironment(match.file.modules);
        return MinecraftRegistry.dumpUpstream({
            hash: hash.value,
            id: match.id.toString(),
            loaders: loaders,
            minecrafts: match.file.gameVersions,
            registry: MinecraftRegistryEnum.CURSEFORGE,
            tag: match.file.id.toString(),
            types: types,
            url: match.file.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${match.id}/files/${match.file.id}/download`
        });
    }

    /**
     * Fetches upstream string from specific tag.
     * @param id Addon ID.
     * @param tag Addon tag.
     * @returns Addon upstream string.
     */
    async fetchUpstreamFromTag(id: string, tag: string): Promise<string> {
        // Creates URL
        const url = this.createBaseURL(`/mods/${id}/files/${tag}`);

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
        const [ types, loaders ] = this.inferUpstreamEnvironment(data.modules);
        return MinecraftRegistry.dumpUpstream({
            hash: hash.value,
            id: data.modId.toString(),
            loaders: loaders,
            minecrafts: data.gameVersions,
            registry: MinecraftRegistryEnum.CURSEFORGE,
            tag: data.id.toString(),
            types: types,
            url: data.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${data.modId}/files/${data.id}/download`
        });
    }

    /**
     * Fetches upstream strings from specific ID.
     * @param minecraft Minecraft version.
     * @param id Addon ID.
     * @returns Addon upstream strings.
     */
    async fetchUpstreamsFromID(minecraft: string, id: string): Promise<string[]> {
        // Creates URL
        const url = this.createBaseURL(`/mods/${id}/files`);
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
            const [ types, loaders ] = this.inferUpstreamEnvironment(entry.modules);
            return MinecraftRegistry.dumpUpstream({
                hash: hash.value,
                id: entry.modId.toString(),
                loaders: loaders,
                minecrafts: entry.gameVersions,
                registry: MinecraftRegistryEnum.CURSEFORGE,
                types: types,
                tag: entry.id.toString(),
                url: entry.downloadUrl ?? `https://www.curseforge.com/api/v1/mods/${entry.modId}/files/${entry.id}/download`
            });
        });
    }

    /**
     * Infers upstream environment from registry data.
     * @param metafiles Addon metafiles according to CurseForge.
     * @returns Addon upstream environment.
     */
    inferUpstreamEnvironment(metafiles: { name: string; }[]): [ MinecraftTypeEnum[], MinecraftLoaderEnum[] ] {
        // Infers loaders
        const loaders: MinecraftLoaderEnum[] = [];
        if(metafiles.some((metafile) => metafile.name === "fabric.mod.json")) loaders.push(MinecraftLoaderEnum.FABRIC);
        if(metafiles.some((metafile) => metafile.name === "mods.toml")) loaders.push(MinecraftLoaderEnum.FORGE);
        if(metafiles.some((metafile) => metafile.name === "neoforge.mods.toml")) loaders.push(MinecraftLoaderEnum.NEOFORGE);
        if(metafiles.some((metafile) => metafile.name === "quilt.mod.json")) loaders.push(MinecraftLoaderEnum.QUILT);
        if(metafiles.some((metafile) => metafile.name === "paper-plugin.yml")) loaders.push(MinecraftLoaderEnum.PAPER);
        else if(metafiles.some((metafile) => metafile.name === "plugin.yml")) loaders.push(
            MinecraftLoaderEnum.BUKKIT,
            MinecraftLoaderEnum.PAPER,
            MinecraftLoaderEnum.PURPUR,
            MinecraftLoaderEnum.SPIGOT
        );
        if(metafiles.some((metafile) => metafile.name === "shaders")) loaders.push(MinecraftLoaderEnum.IRIS, MinecraftLoaderEnum.OPTIFINE);
        if(metafiles.some((metafile) => metafile.name === "pack.mcmeta")) {
            if(metafiles.some((metafile) => metafile.name === "data")) loaders.push(MinecraftLoaderEnum.DATAPACK);
            else if(metafiles.some((metafile) => metafile.name === "assets")) loaders.push(MinecraftLoaderEnum.MINECRAFT);
        }

        // Infers types
        const types: MinecraftTypeEnum[] = [];
        if(loaders.some((loader) => [
            MinecraftLoaderEnum.FABRIC,
            MinecraftLoaderEnum.FORGE,
            MinecraftLoaderEnum.NEOFORGE,
            MinecraftLoaderEnum.QUILT
        ].includes(loader))) types.push(MinecraftTypeEnum.MOD);
        if(loaders.some((loader) => [
            MinecraftLoaderEnum.PAPER,
            MinecraftLoaderEnum.SPIGOT
        ].includes(loader))) types.push(MinecraftTypeEnum.PLUGIN);
        if(loaders.some((loader) => loader === MinecraftLoaderEnum.DATAPACK)) types.push(MinecraftTypeEnum.DATAPACK);
        if(loaders.some((loader) => loader === MinecraftLoaderEnum.MINECRAFT)) types.push(MinecraftTypeEnum.RESOURCEPACK);
        if(loaders.some((loader) => [
            MinecraftLoaderEnum.IRIS,
            MinecraftLoaderEnum.OPTIFINE,
            MinecraftLoaderEnum.VANILLA
        ].includes(loader))) types.push(MinecraftTypeEnum.SHADERPACK);
        
        // Returns environment
        return [ types, loaders ];
    }
}
