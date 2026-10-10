// Imports
import type { MinecraftInstance } from "./minecraft-instance";
import { basename as getBasename, resolve as resolvePath } from "node:path";
import AdmZip from "adm-zip";
import {
    error,
    MinecraftDownload,
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
     * @param instance Minecraft instance.
     * @returns Datapacks subdirectory.
     */
    static getDatapacksSubdirectory(instance: MinecraftInstance): string {
        // Returns directory
        return "data";
    }

    /**
     * Gets mods subdirectory.
     * @param instance Minecraft instance.
     * @returns Mods subdirectory.
     */
    static getModsSubdirectory(instance: MinecraftInstance): string {
        // Returns directory
        return "mods";
    }

    /**
     * Gets plugins subdirectory.
     * @param instance Minecraft instance.
     * @returns Plugins subdirectory.
     */
    static getPluginsSubdirectory(instance: MinecraftInstance): string {
        // Returns directory
        return "plugins";
    }

    /**
     * Gets resourcepacks subdirectory.
     * @param instance Minecraft instance.
     * @returns Resourcepacks subdirectory.
     */
    static getResourcepacksSubdirectory(instance: MinecraftInstance): string {
        // Returns directory
        return "resourcepacks";
    }

    /**
     * Gets shaderpacks subdirectory.
     * @param instance Minecraft instance.
     * @returns Shaderpacks subdirectory.
     */
    static getShaderpacksSubdirectory(instance: MinecraftInstance): string {
        // Returns directory
        return "shaderpacks";
    }

    /**
     * Deletes source file.
     */
    async deleteSource(): Promise<void> {
        // Deletes source
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        await Bun.file(this._filepath).unlink();
        this._filepath = null;
    }

    /**
     * Downloads source file.
     */
    async downloadSource(): Promise<MinecraftDownload> {
        // Downloads source file
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));
        return await MinecraftRegistry.downloadSource(this._upstream);
    }

    /**
     * Estimates download size of source file.
     * @returns Download size.
     */
    async estimateSource(): Promise<number> {
        // Estimates download size
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));
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
        const pack = await this.instance.readPackJSON();

        // Gets directory
        if(this._upstream === null) throw new Error(error("NO_UPSTREAM"));
        switch(MinecraftRegistry.inferUpstreamType(this._upstream, pack.environment)) {
            case MinecraftTypeEnum.DATAPACK: return resolvePath(this.instance.path, MinecraftAddon.getDatapacksSubdirectory(this.instance));
            case MinecraftTypeEnum.MOD: return resolvePath(this.instance.path, MinecraftAddon.getModsSubdirectory(this.instance));
            case MinecraftTypeEnum.PLUGIN: return resolvePath(this.instance.path, MinecraftAddon.getPluginsSubdirectory(this.instance));
            case MinecraftTypeEnum.RESOURCEPACK: return resolvePath(this.instance.path, MinecraftAddon.getResourcepacksSubdirectory(this.instance));
            case MinecraftTypeEnum.SHADERPACK: return resolvePath(this.instance.path, MinecraftAddon.getShaderpacksSubdirectory(this.instance));
            default: throw new Error(error("BAD_UPSTREAM", { upstream: this._upstream }));
        }
    }


    /**
     * Installs source file from download.
     * @param download Minecraft download.
     */
    async installDownload(download: MinecraftDownload): Promise<void> {
        // Installs download
        if(this._filepath !== null) throw new Error(error("NO_OVERWRITE", { filepath: this._filepath }));
        if(download.disposed) throw new Error(error("BAD_DOWNLOAD"));
        try {
            const filepath = resolvePath(await this.getDirectory(), download.filename);
            await Bun.write(filepath, await download.download);
            this._filepath = filepath;
        }
        finally {
            await download.dispose();
        }
    }

    /**
     * Reads "fabric.mod.json" source metadata file.
     * @returns Minecraft metadata.
     */
    readFabricModJSON(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("fabric.mod.json", (data) => {
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
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
     * Reads source metadata file.
     * @returns Minecraft metadata.
     */
    async readMetadata(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        try { return await this.readFabricModJSON(); } catch {}
        try { return await this.readModsTOML(); } catch {}
        try { return await this.readNeoForgeModsTOML(); } catch {}
        try { return await this.readPluginYML(); } catch {}
        try { return await this.readPaperPluginYML(); } catch {}
        try { return await this.readPackMCMETA(); } catch {}

        // Returns fallback metadata
        return { authors: [], code: "", description: "", name: getBasename(this._filepath), version: "" };
    }

    /**
     * Reads "META-INF/mods.toml" source metadata file.
     * @returns Minecraft metadata.
     */
    readModsTOML(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("META-INF/mods.toml", (data) => {
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
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
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("META-INF/neoforge.mods.toml", (data) => {
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
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
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        const archive = new AdmZip(this._filepath);
        const filename = getBasename(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("pack.mcmeta", (data) => {
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
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
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("paper-plugin.yml", (data) => {
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
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
        // Reads source metadata file
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        const archive = new AdmZip(this._filepath);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("plugin.yml", (data) => {
                if(data === null) return reject(error("BAD_METADATA", { filepath: this._filepath }));
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
        // Relinks upstream string
        if(this._filepath === null) throw new Error(error("NO_FILEPATH"));
        for(const registry of this.instance.registries) {
            try {
                const upstream = await registry.fetchUpstreamFromSource(this._filepath);
                this._upstream = upstream;
                break;
            }
            catch {}
        }
        throw new Error(error("REGISTRY_NO_UPSTREAM"));
    }

    /** Upstream string. */
    get upstream(): string | null {
        // Returns upstream string
        return this._upstream;
    }
}
