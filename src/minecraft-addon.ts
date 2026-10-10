// Imports
import type MinecraftInstance from "./minecraft-instance";
import { basename as getBasename, resolve as resolvePath } from "node:path";
import AdmZip from "adm-zip";
import {
    error,
    MinecraftDownload,
    MinecraftEnvironment,
    MinecraftMetadata,
    MinecraftTypeEnum
} from "./common";
import MinecraftRegistry from "./minecraft-registry";

/** Minecraft addon. */
export default class MinecraftAddon {
    /** Source filepath. */
    private _filepath: string | null;
    /** Upstream string. */
    private _upstream: string | null;
    /** Minecraft instance. */
    readonly instance: MinecraftInstance;

    /**
     * Creates new Minecraft addon.
     * @param instance Minecraft instance.
     * @param filepath Source filepath.
     * @param upstream Upstream string.
     */
    constructor(instance: MinecraftInstance, filepath: string | null, upstream: string | null) {
        // Inits fields
        this._filepath = filepath;
        this._upstream = upstream;
        this.instance = instance;
    }

    /**
     * Gets datapacks subdirectory.
     * @returns Datapacks subdirectory.
     */
    static getDatapacksSubdirectory(): string {
        // Gets subdirectory
        return "data";
    }

    /**
     * Gets mods subdirectory.
     * @returns Mods subdirectory.
     */
    static getModsSubdirectory(): string {
        // Gets subdirectory
        return "mods";
    }

    /**
     * Gets plugins subdirectory.
     * @returns Plugins subdirectory.
     */
    static getPluginsSubdirectory(): string {
        // Gets subdirectory
        return "plugins";
    }

    /**
     * Gets resourcepacks subdirectory.
     * @returns Resourcepacks subdirectory.
     */
    static getResourcepacksSubdirectory(): string {
        // Gets subdirectory
        return "resourcepacks";
    }

    /**
     * Gets shaderpacks subdirectory.
     * @returns Shaderpacks subdirectory.
     */
    static getShaderpacksSubdirectory(): string {
        // Gets subdirectory
        return "shaderpacks";
    }

    /**
     * Deletes source file.
     */
    async deleteSource(): Promise<void> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));

        // Deletes source
        await Bun.file(this._filepath).unlink();

        // Updates fields
        this._filepath = null;
    }

    /**
     * Downloads source file from migration.
     * @param environment Migration environment.
     * @returns 
     */
    async downloadMigration(environment: MinecraftEnvironment): Promise<MinecraftDownload> {
        // Finds upstream
        const upstream = await this.migrateSource(environment);
        if(upstream === null) throw new Error(error("REGISTRY_NO_UPSTREAM"));
        
        // Downloads source file
        return await MinecraftRegistry.downloadSource(upstream);
    }


    /**
     * Downloads source file from upstream string.
     * @returns Minecraft download.
     */
    async downloadSource(): Promise<MinecraftDownload> {
        // Checks upstream
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));
        
        // Downloads source file
        return await MinecraftRegistry.downloadSource(this._upstream);
    }

    /**
     * Downloads source file from upgrade.
     * @returns Minecraft download.
     */
    async downloadUpgrade(): Promise<MinecraftDownload> {
        // Finds upstream
        const upstream = await this.upgradeSource();
        if(upstream === null) throw new Error(error("REGISTRY_NO_UPSTREAM"));
        
        // Downloads source file
        return await MinecraftRegistry.downloadSource(upstream);
    }

    /**
     * Estimates download size of source file.
     * @returns Download size.
     */
    async estimateSource(): Promise<number> {
        // Checks upstream
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));
        
        // Estimates download size
        return await MinecraftRegistry.estimateSource(this._upstream);
    }

    /** Source filepath. */
    get filepath(): string | null {
        // Returns filepath
        return this._filepath;
    }

    /**
     * Gets addon directory.
     * @returns Addon directory.
     */
    async getDirectory(): Promise<string> {
        // Reads pack
        const pack = await this.instance.loadGSMCPackJSON();

        // Gets directory
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));
        switch(MinecraftRegistry.inferUpstreamType(this._upstream, pack.environment)) {
            case MinecraftTypeEnum.DATAPACK: return resolvePath(this.instance.dirpath, MinecraftAddon.getDatapacksSubdirectory());
            case MinecraftTypeEnum.MOD: return resolvePath(this.instance.dirpath, MinecraftAddon.getModsSubdirectory());
            case MinecraftTypeEnum.PLUGIN: return resolvePath(this.instance.dirpath, MinecraftAddon.getPluginsSubdirectory());
            case MinecraftTypeEnum.RESOURCEPACK: return resolvePath(this.instance.dirpath, MinecraftAddon.getResourcepacksSubdirectory());
            case MinecraftTypeEnum.SHADERPACK: return resolvePath(this.instance.dirpath, MinecraftAddon.getShaderpacksSubdirectory());
            default: throw new Error(error("BAD_UPSTREAM", { upstream: this._upstream }));
        }
    }

    /**
     * Fetches upstream string of migrated source file.
     * @param environment Minecraft environment.
     * @returns Upstream string of migrated source file.
     */
    async migrateSource(environment: MinecraftEnvironment): Promise<string | null> {
        // Checks upstream
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));

        // Checks environment
        if(MinecraftRegistry.satisfiesEnvironment(this._upstream, environment)) return null;

        // Searches migrations
        const loaders = {
            [ MinecraftTypeEnum.DATAPACK ]: environment.datapackLoader,
            [ MinecraftTypeEnum.MOD ]: environment.custompackLoader,
            [ MinecraftTypeEnum.PLUGIN ]: environment.custompackLoader,
            [ MinecraftTypeEnum.RESOURCEPACK ]: environment.resourcepackLoader,
            [ MinecraftTypeEnum.SHADERPACK ]: environment.shaderpackLoader
        };
        const { id } = MinecraftRegistry.loadUpstream(this._upstream);
        const type = MinecraftRegistry.inferUpstreamType(this._upstream, environment);
        const upstream = await this.instance.resolveQuery(`${id}@latest#${loaders[type]}=${environment.minecraft}`);
        return upstream;
    }

    /**
     * Fetches upstream string of latest source file.
     * @returns Upstream string of latest source file.
     */
    async upgradeSource(): Promise<string | null> {
        // Checks upstream
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));

        // Searches upgrades
        const { environment } = await this.instance.loadGSMCPackJSON();
        const loaders = {
            [ MinecraftTypeEnum.DATAPACK ]: environment.datapackLoader,
            [ MinecraftTypeEnum.MOD ]: environment.custompackLoader,
            [ MinecraftTypeEnum.PLUGIN ]: environment.custompackLoader,
            [ MinecraftTypeEnum.RESOURCEPACK ]: environment.resourcepackLoader,
            [ MinecraftTypeEnum.SHADERPACK ]: environment.shaderpackLoader
        };
        const { id } = MinecraftRegistry.loadUpstream(this._upstream);
        const type = MinecraftRegistry.inferUpstreamType(this._upstream, environment);
        const upstream = await this.instance.resolveQuery(`${id}@latest#${loaders[type]}=${environment.minecraft}`);
        return upstream;
    }

    /**
     * Installs download.
     * @param download Minecraft download.
     */
    async installSource(download: MinecraftDownload): Promise<void> {
        // Checks download
        if(download.disposed) throw new Error(error("BAD_DOWNLOAD"));
        
        // Prevents overwrites
        const filepath = resolvePath(await this.getDirectory(), download.filename);
        if(this._filepath === filepath) throw new Error(error("OVERWRITE_DANGER", { filepath: this._filepath }));
        
        // Installs download
        try {
            // Writes source
            await Bun.write(filepath, await download.download);

            // Updates pack
            if(this._filepath !== null) {
                const hash = Bun.CryptoHasher.hash("sha1", await Bun.file(this._filepath).arrayBuffer()).toHex();
                await this.instance.removeUpstream(hash);
            }
            await this.instance.addUpstream(download.upstream);

            // Updates fields
            const staleFilepath = this._filepath;
            this._filepath = filepath;
            this._upstream = download.upstream;
            
            // Cleans scene
            if(staleFilepath !== null) await Bun.file(staleFilepath).unlink();
        }
        catch { await Bun.file(filepath).unlink(); }
        finally { await download.dispose(); }
    }

    /**
     * Reads "fabric.mod.json" source metadata file.
     * @returns Minecraft metadata.
     */
    readFabricModJSON(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Reads source metadata file
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("fabric.mod.json", (data) => {
                // Checks null
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                
                // Reads metadata
                try {
                    const json = JSON.parse(data.toString()) as object;
                    if(
                        "id" in json === false ||
                        "version" in json === false
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    const authors = "authors" in json ? json["authors"] as (string | { "name": string; })[] : [];
                    return resolve({
                        authors: authors.map((author) => typeof author === "string" ? author : author.name),
                        description: "description" in json ? json["description"] as string : "",
                        code: json["id"] as string,
                        name: "name" in json ? json["name"] as string : json["id"] as string,
                        version: json["version"] as string
                    });
                }
                catch { return reject(error("BAD_METADATA")); }
            });
        });
    }

    /**
     * Reads "META-INF/mods.toml" source metadata file.
     * @returns Minecraft metadata.
     */
    readModsTOML(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Reads source metadata file
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("META-INF/mods.toml", (data) => {
                // Checks null
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                
                // Reads metadata
                try {
                    const toml = Bun.TOML.parse(data.toString());
                    if(
                        "mods" in toml === false ||
                        !Array.isArray(toml.mods) ||
                        toml.mods.length === 0
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    const mod = toml.mods[0] as object;
                    if(
                        "modId" in mod === false ||
                        "version" in mod === false
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    return resolve({
                        authors: [ "authors" in mod ? mod["authors"] as string : "" ],
                        description: "description" in mod ? mod["description"] as string : "",
                        code: mod["modId"] as string,
                        name: "displayName" in mod ? mod["displayName"] as string : mod["modId"] as string,
                        version: mod["version"] as string
                    });
                }
                catch { return reject(error("BAD_METADATA", { filepath: this._filepath })); }
            });
        });
    }

    /**
     * Reads "META-INF/neoforge.mods.toml" source metadata file.
     * @returns Minecraft metadata.
     */
    readNeoForgeModsTOML(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Reads source metadata file
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("META-INF/neoforge.mods.toml", (data) => {
                // Checks null
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                
                // Reads metadata
                try {
                    const toml = Bun.TOML.parse(data.toString());
                    if(
                        "mods" in toml === false ||
                        !Array.isArray(toml.mods) ||
                        toml.mods.length === 0
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    const mod = toml.mods[0] as object;
                    if(
                        "modId" in mod === false ||
                        "version" in mod === false
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    return resolve({
                        authors: [ "authors" in mod ? mod["authors"] as string : "" ],
                        description: "description" in mod ? mod["description"] as string : "",
                        code: mod["modId"] as string,
                        name: "displayName" in mod ? mod["displayName"] as string : mod["modId"] as string,
                        version: mod["version"] as string
                    });
                }
                catch { return reject(error("BAD_METADATA", { filepath: this._filepath })); }
            });
        });
    }

    /**
     * Reads "pack.mcmeta" source metadata file.
     * @returns Minecraft metadata.
     */
    readPackMCMETA(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Reads source metadata file
        const archive = new AdmZip(this._filepath);
        const filename = getBasename(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("pack.mcmeta", (data) => {
                // Checks null
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                
                // Reads metadata
                try {
                    const json = JSON.parse(data.toString()) as object;
                    if(
                        "pack" in json === false ||
                        typeof json.pack !== "object" ||
                        json.pack === null
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    const description = "description" in json.pack ? json.pack["description"] as string : "";
                    return resolve({
                        authors: [],
                        description: description,
                        code: "",
                        name: filename,
                        version: ""
                    });
                }
                catch { return reject(error("BAD_METADATA", { filepath: this._filepath })); }
            });
        });
    }

    /**
     * Reads "paper-plugin.yml" source metadata file.
     * @returns Minecraft metadata.
     */
    readPaperPluginYML(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));

        // Reads source metadata file
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("paper-plugin.yml", (data) => {
                // Checks null
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                
                // Reads metadata
                try {
                    const yaml = Bun.YAML.parse(data.toString()) as object;
                    if(
                        "name" in yaml === false ||
                        "version" in yaml === false
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    return resolve({
                        authors: [ "author" in yaml ? yaml["author"] as string : "" ],
                        description: "description" in yaml ? yaml["description"] as string : "",
                        code: "",
                        name: yaml["name"] as string,
                        version: yaml["version"] as string
                    });
                }
                catch { return reject(error("BAD_METADATA", { filepath: this._filepath })); }
            });
        });
    }

    /**
     * Reads "plugin.yml" source metadata file.
     * @returns Minecraft metadata.
     */
    readPluginYML(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Reads source metadata file
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("plugin.yml", (data) => {
                // Checks null
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                
                // Reads metadata
                try {
                    const yaml = Bun.YAML.parse(data.toString()) as object;
                    if(
                        "name" in yaml === false ||
                        "version" in yaml === false
                    ) return reject(error("BAD_METADATA", { filepath: this._filepath }));
                    return resolve({
                        authors: [ "author" in yaml ? yaml["author"] as string : "" ],
                        description: "description" in yaml ? yaml["description"] as string : "",
                        code: "",
                        name: yaml["name"] as string,
                        version: yaml["version"] as string
                    });
                }
                catch { return reject(error("BAD_METADATA", { filepath: this._filepath })); }
            });
        });
    }

    /**
     * Relinks upstream string.
     * @returns Upstream string.
     */
    async relinkUpstream(): Promise<void> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Relinks upstream string
        for(const registry of this.instance.registries) {
            try {
                // Fetches upstream
                const upstream = await registry.fetchUpstreamFromFilepath(this._filepath);
                
                // Updates pack
                await this.instance.addUpstream(upstream);

                // Updates fields
                this._upstream = upstream;
                break;
            }
            catch {}
        }
        throw new Error(error("REGISTRY_NO_UPSTREAM"));
    }

    /**
     * Reads source metadata file.
     * @returns Minecraft metadata.
     */
    async resolveMetadata(): Promise<MinecraftMetadata> {
        // Checks filepath
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        
        // Reads source metadata file
        try { return await this.readFabricModJSON(); } catch {}
        try { return await this.readModsTOML(); } catch {}
        try { return await this.readNeoForgeModsTOML(); } catch {}
        try { return await this.readPluginYML(); } catch {}
        try { return await this.readPaperPluginYML(); } catch {}
        try { return await this.readPackMCMETA(); } catch {}

        // Returns fallback
        return { authors: [], code: "", description: "", name: getBasename(this._filepath), version: "" };
    }

    /** Upstream string. */
    get upstream(): string | null {
        // Returns upstream string
        return this._upstream;
    }
}
