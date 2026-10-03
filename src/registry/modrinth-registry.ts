// Imports
import { MinecraftLoaderEnum, MinecraftRegistry, MinecraftRegistryEnum, MinecraftTypeEnum } from "../minecraft-registry";
import { error } from "../common/error";
import { version as build } from "../../package.json";

/** Modrinth registry. */
export class ModrinthRegistry extends MinecraftRegistry {
    /**
     * Creates base URL to API.
     * @param endpoint API endpoint.
     * @returns URL object.
     */
    createBaseURL(endpoint: string): URL {
        // Creates URL
        return new URL("https://api.modrinth.com/v2" + endpoint);
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
     * Fetches ID from slug.
     * @param slug Addon slug.
     * @returns Addon ID.
     */
    async fetchIDFromSlug(slug: string): Promise<string> {
        // Creates URL
        const url = this.createBaseURL(`/project/${slug}/check`);

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
     * Fetches upstream string from source file.
     * @param source Addon source file.
     * @returns Addon upstream string.
     */
    async fetchUpstreamFromSource(source: Bun.BunFile): Promise<string> {
        // Hashes source
        const hash = Bun.CryptoHasher.hash("sha1", await source.arrayBuffer()).toHex();

        // Creates URL
        const url = this.createBaseURL(`/version_file/${hash}`);

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
        const [ types, loaders ] = this.inferUpstreamEnvironment(project.loaders);
        return MinecraftRegistry.dumpUpstream({
            hash: file.hashes.sha1,
            id: project.project_id,
            loaders: loaders,
            minecrafts: project.game_versions,
            registry: MinecraftRegistryEnum.MODRINTH,
            tag: project.id,
            types: types,
            url: file.url
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
        const url = this.createBaseURL(`/version/${tag}`);
        
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
        const [ types, loaders ] = this.inferUpstreamEnvironment(project.loaders);
        return MinecraftRegistry.dumpUpstream({
            hash: file.hashes.sha1,
            id: project.project_id,
            loaders: loaders,
            minecrafts: project.game_versions,
            registry: MinecraftRegistryEnum.MODRINTH,
            tag: project.id,
            types: types,
            url: file.url
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
        const url = this.createBaseURL(`/project/${id}/version`);
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
            const [ types, loaders ] = this.inferUpstreamEnvironment(project.loaders);
            return MinecraftRegistry.dumpUpstream({
                hash: file.hashes.sha1,
                id: project.project_id,
                loaders: loaders,
                minecrafts: project.game_versions,
                registry: MinecraftRegistryEnum.MODRINTH,
                tag: project.id,
                types: types,
                url: file.url
            });
        });
    }

    /**
     * Infers upstream environment from registry data.
     * @param projectLoaders Project loaders according to Modrinth.
     * @returns Addon upstream environment.
     */
    inferUpstreamEnvironment(projectLoaders: string[]): [ MinecraftTypeEnum[], MinecraftLoaderEnum[] ] {
        // Infers loaders
        const loaders: MinecraftLoaderEnum[] = [];
        if(projectLoaders.includes("bukkit")) loaders.push(MinecraftLoaderEnum.BUKKIT);
        if(projectLoaders.includes("datapack")) loaders.push(MinecraftLoaderEnum.DATAPACK);
        if(projectLoaders.includes("fabric")) loaders.push(MinecraftLoaderEnum.FABRIC);
        if(projectLoaders.includes("forge")) loaders.push(MinecraftLoaderEnum.FORGE);
        if(projectLoaders.includes("iris")) loaders.push(MinecraftLoaderEnum.IRIS);
        if(projectLoaders.includes("minecraft")) loaders.push(MinecraftLoaderEnum.MINECRAFT);
        if(projectLoaders.includes("neoforge")) loaders.push(MinecraftLoaderEnum.NEOFORGE);
        if(projectLoaders.includes("optifine")) loaders.push(MinecraftLoaderEnum.OPTIFINE);
        if(projectLoaders.includes("paper")) loaders.push(MinecraftLoaderEnum.PAPER);
        if(projectLoaders.includes("purpur")) loaders.push(MinecraftLoaderEnum.PURPUR);
        if(projectLoaders.includes("quilt")) loaders.push(MinecraftLoaderEnum.QUILT);
        if(projectLoaders.includes("spigot")) loaders.push(MinecraftLoaderEnum.SPIGOT);
        if(projectLoaders.includes("vanilla")) loaders.push(MinecraftLoaderEnum.VANILLA);

        // Infers types
        const types: MinecraftTypeEnum[] = [];
        if(loaders.some((loader) => [
            MinecraftLoaderEnum.FABRIC,
            MinecraftLoaderEnum.FORGE,
            MinecraftLoaderEnum.NEOFORGE,
            MinecraftLoaderEnum.QUILT
        ].includes(loader))) types.push(MinecraftTypeEnum.MOD);
        if(loaders.some((loader) => [
            MinecraftLoaderEnum.BUKKIT,
            MinecraftLoaderEnum.PAPER,
            MinecraftLoaderEnum.PURPUR,
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
