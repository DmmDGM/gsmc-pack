// Imports
import {
    error,
    GSMCPACK_BUILD,
    MINECRAFT_LOADER_TYPE_MAP,
    MinecraftLoaderEnum,
    MinecraftRegistryEnum,
    MinecraftTypeEnum
} from "../common";
import MinecraftRegistry from "../minecraft-registry";

/** Modrinth registry. */
export default class ModrinthRegistry extends MinecraftRegistry {
    /** Modrinth registry. */
    readonly registry = MinecraftRegistryEnum.MODRINTH;

    /**
     * Creates GET request to API.
     * @param url URL object.
     * @returns API response.
     */
    private async createGetRequest(url: URL): Promise<Response> {
        // Creates headers
        const headers = new Headers();
        headers.append("user-agent", `DmmDGM/gsmc-pack/${GSMCPACK_BUILD} (dmmdgm@dmmdgm.dev)`);

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
     * Fetches unique ID from unique slug.
     * @param slug Unique slug.
     * @returns Unique ID.
     */
    async fetchIDFromSlug(slug: string): Promise<string> {
        // Creates URL
        const url = new URL(`https://api.modrinth.com/v2/project/${slug}/check`);

        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const match = await response.json() as {
            id: string;
        };

        // Returns ID
        return match.id;
    }
    
    /**
     * Fetches upstream string from source filepath.
     * @param source Source filepath.
     * @returns Upstream string.
     */
    async fetchUpstreamFromFilepath(filepath: string): Promise<string> {
        // Hashes source
        const hash = Bun.CryptoHasher.hash("sha1", await Bun.file(filepath).arrayBuffer()).toHex();

        // Creates URL
        const url = new URL(`https://api.modrinth.com/v2/version_file/${hash}`);

        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const project = await response.json() as {
            files: {
                hashes: {
                    sha1: string;
                };
                primary: boolean;
                url: string;
            }[];
            game_versions: string[];
            id: string;
            loaders: string[];
            project_id: string;
        };

        // Returns upstream string
        const file = project.files.find((file) => file.primary) || project.files[0];
        const { loaders, types } = this.inferUpstreamEnvironment(project.loaders);
        return MinecraftRegistry.dumpUpstream({
            hash: file.hashes.sha1,
            id: project.project_id,
            loaders: loaders,
            minecrafts: project.game_versions,
            registry: this.registry,
            tag: project.id,
            types: types,
            url: file.url
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
        const url = new URL(`https://api.modrinth.com/v2/version/${tag}`);
        
        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const project = await response.json() as {
            files: {
                hashes: {
                    sha1: string;
                };
                primary: boolean;
                url: string;
            }[];
            game_versions: string[];
            id: string;
            loaders: string[];
            project_id: string;
        };

        // Returns upstream string
        const file = project.files.find((file) => file.primary) || project.files[0];
        const { loaders, types } = this.inferUpstreamEnvironment(project.loaders);
        return MinecraftRegistry.dumpUpstream({
            hash: file.hashes.sha1,
            id: project.project_id,
            loaders: loaders,
            minecrafts: project.game_versions,
            registry: this.registry,
            tag: project.id,
            types: types,
            url: file.url
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
        const url = new URL(`https://api.modrinth.com/v2/project/${id}/version`);
        url.searchParams.append("game_versions", JSON.stringify([ minecraft ]));
        url.searchParams.append("include_changelog", JSON.stringify(false));

        // Makes request
        const response = await this.createGetRequest(url);
        if(!response.ok) throw new Error(error("REGISTRY_BAD_RESPONSE", { code: response.status }));

        // Parses response
        const projects = await response.json() as {
            date_published: string;
            files: {
                hashes: {
                    sha1: string;
                };
                primary: boolean;
                url: string;
            }[];
            game_versions: string[];
            id: string;
            loaders: string[];
            project_id: string;
        }[];

        // Returns upstream strings
        return projects.sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published)).map((project) => {
            const file = project.files.find((file) => file.primary) || project.files[0];
            const { loaders, types } = this.inferUpstreamEnvironment(project.loaders);
            return MinecraftRegistry.dumpUpstream({
                hash: file.hashes.sha1,
                id: project.project_id,
                loaders: loaders,
                minecrafts: project.game_versions,
                registry: this.registry,
                tag: project.id,
                types: types,
                url: file.url
            });
        });
    }

    /**
     * Infers upstream environment from registry data.
     * @param projectLoaders Project loaders from Modrinth.
     * @returns Upstream environment.
     */
    private inferUpstreamEnvironment(projectLoaders: string[]): {
        loaders: MinecraftLoaderEnum[];
        types: MinecraftTypeEnum[];
    } {
        // Infers loaders
        const loaders = new Set<MinecraftLoaderEnum>();
        for(const projectLoader of projectLoaders) {
            switch(projectLoader) {
                case "bukkit": {
                    loaders.add(MinecraftLoaderEnum.BUKKIT);
                    break;
                }
                case "datapack": {
                    loaders.add(MinecraftLoaderEnum.DATAPACK);
                    break;
                }
                case "fabric": {
                    loaders.add(MinecraftLoaderEnum.FABRIC);
                    break;
                }
                case "forge": {
                    loaders.add(MinecraftLoaderEnum.FORGE);
                    break;
                }
                case "iris": {
                    loaders.add(MinecraftLoaderEnum.IRIS);
                    break;
                }
                case "minecraft": {
                    loaders.add(MinecraftLoaderEnum.RESOURCEPACK);
                    break;
                }
                case "neoforge": {
                    loaders.add(MinecraftLoaderEnum.NEOFORGE);
                    break;
                }
                case "optifine": {
                    loaders.add(MinecraftLoaderEnum.OPTIFINE);
                    break;
                }
                case "paper": {
                    loaders.add(MinecraftLoaderEnum.PAPER);
                    break;
                }
                case "purpur": {
                    loaders.add(MinecraftLoaderEnum.PURPUR);
                    break;
                }
                case "quilt": {
                    loaders.add(MinecraftLoaderEnum.QUILT);
                    break;
                }
                case "spigot": {
                    loaders.add(MinecraftLoaderEnum.SPIGOT);
                    break;
                }
                case "vanilla": {
                    loaders.add(MinecraftLoaderEnum.SHADERPACK);
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
