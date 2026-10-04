// Imports
import type { MinecraftDownload } from "./minecraft-download";
import type { MinecraftInstance } from "./minecraft-instance";
import { basename as getBasename, resolve as resolvePath } from "node:path";
import { error } from "./error";
import { MinecraftEnvironment, MinecraftRegistry, MinecraftTypeEnum } from "./minecraft-registry";
import AdmZip from "adm-zip";

/** Minecraft metadata. */
export interface MinecraftMetadata {
    /** Addon authors. */
    authors: string[];
    /** Addon description. */
    description: string;
    /** Addon label. */
    label: string;
    /** Addon name. */
    name: string;
    /** Addon version. */
    version: string;
}

/** Minecraft addon. */
export class MinecraftAddon {
    /** Minecraft instance. */
    readonly instance: MinecraftInstance;
    /** Source file. */
    readonly source: Bun.BunFile | null;
    /** Upstream string. */
    readonly upstream: string | null;

    /**
     * Creates new Minecraft addon.
     * @param instance Minecraft instance.
     * @param source Source file.
     * @param upstream Upstream string.
     */
    constructor(instance: MinecraftInstance, source: Bun.BunFile | null, upstream: string | null) {
        // Inits fields
        this.instance = instance;
        this.source = source;
        this.upstream = upstream;
    }

    /**
     * Gets datapacks subdirectory.
     * @returns Datapacks subdirectory.
     */
    static getDatapacksSubdirectory(): string {
        // Returns directory
        return "data";
    }

    /**
     * Gets mods subdirectory.
     * @returns Mods subdirectory.
     */
    static getModsSubdirectory(): string {
        // Returns directory
        return "mods";
    }

    /**
     * Gets plugins subdirectory.
     * @returns Plugins subdirectory.
     */
    static getPluginsSubdirectory(): string {
        // Returns directory
        return "plugins";
    }

    /**
     * Gets resourcepacks subdirectory.
     * @returns Resourcepacks subdirectory.
     */
    static getResourcepacksSubdirectory(): string {
        // Returns directory
        return "resourcepacks";
    }

    /**
     * Gets shaderpacks subdirectory.
     * @returns Shaderpacks subdirectory.
     */
    static getShaderpacksSubdirectory(): string {
        // Returns directory
        return "shaderpacks";
    }

    /**
     * Deletes source file.
     * @param commit Whether to modify instance.
     */
    async deleteSource(commit: boolean = false): Promise<MinecraftAddon> {
        // Deletes source
        if(this.source === null) throw new Error(error("DELETE_NO_SOURCE"));
        if(commit) await this.source.unlink();
        return new MinecraftAddon(this.instance, null, this.upstream);
    }

    /**
     * Downloads source file.
     * @param commit Whether to modify instance.
     * @returns Minecraft download and eventual Minecraft addon.
     */
    async downloadSource(commit: boolean = false): Promise<[ MinecraftDownload, Promise<MinecraftAddon> ]> {
        // Downloads source file
        if(this.upstream === null) throw new Error(error("DOWNLOAD_NO_UPSTREAM"));
        const download = await MinecraftRegistry.downloadSource(this.upstream);
        const addon = new Promise<MinecraftAddon>(async (resolve, reject) => {
            try {
                const pack = await this.instance.readPackJSON();
                const directory = this.getDirectory(pack.environment);
                const source = commit ? await download.writeFile(directory) : this.source;
                return resolve(new MinecraftAddon(this.instance, source, this.upstream));
            }
            catch(reason) { return reject(reason); }
            finally { await download.disposeDownload(); }
        });
        return [ download, addon ];
    }

    /**
     * Estimates size of download file.
     * @returns Size of download file.
     */
    async estimateSource(): Promise<number> {
        // Estimates download size
        if(this.upstream === null) throw new Error(error("ESTIMATE_NO_UPSTREAM"));
        return MinecraftRegistry.estimateSource(this.upstream);
    }

    /**
     * Gets addon directory.
     * @param environment Minecraft environment.
     * @returns Addon directory.
     */
    getDirectory(environment: MinecraftEnvironment): string {
        // Gets directory
        if(this.upstream === null) throw new Error(error("INFER_NO_UPSTREAM"));
        const type = MinecraftRegistry.loadUpstreamBestType(this.upstream, environment);
        switch(type) {
            case MinecraftTypeEnum.DATAPACK: return resolvePath(this.instance.path, MinecraftAddon.getDatapacksSubdirectory());
            case MinecraftTypeEnum.MOD: return resolvePath(this.instance.path, MinecraftAddon.getModsSubdirectory());
            case MinecraftTypeEnum.PLUGIN: return resolvePath(this.instance.path, MinecraftAddon.getPluginsSubdirectory());
            case MinecraftTypeEnum.RESOURCEPACK: return resolvePath(this.instance.path, MinecraftAddon.getResourcepacksSubdirectory());
            case MinecraftTypeEnum.SHADERPACK: return resolvePath(this.instance.path, MinecraftAddon.getShaderpacksSubdirectory());
            default: throw new Error(error("INFER_BAD_UPSTREAM"));
        }
    }

    /**
     * Reads "fabric.mod.json" source metadata file.
     * @returns Minecraft metadata.
     */
    readFabricModJSON(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        const archive = new AdmZip(this.source.name);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("fabric.mod.json", (data) => {
                if(data === null) return reject(error("METADATA_BAD_SOURCE"));
                try {
                    const json = JSON.parse(data.toString()) as object;
                    if("id" in json === false || "version" in json === false) return reject(error("METADATA_BAD_SOURCE"));
                    const authors = "authors" in json ? json["authors"] as (string | { "name": string; })[] : [];
                    return resolve({
                        authors: authors.map((author) => typeof author === "string" ? author : author.name),
                        description: "description" in json ? json["description"] as string : "",
                        label: json["id"] as string,
                        name: "name" in json ? json["name"] as string : json["id"] as string,
                        version: json["version"] as string
                    });
                }
                catch { return reject(error("METADATA_BAD_SOURCE")); }
            });
        });
    }

    /**
     * Reads source metadata file.
     * @returns Minecraft metadata.
     */
    async readMetadata(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        try { return await this.readFabricModJSON(); } catch {}
        try { return await this.readModsTOML(); } catch {}
        try { return await this.readNeoForgeModsTOML(); } catch {}
        try { return await this.readPluginYML(); } catch {}
        try { return await this.readPaperPluginYML(); } catch {}
        try { return await this.readPackMCMETA(); } catch {}

        // Returns fallback metadata
        return {
            authors: [],
            description: "",
            label: "",
            name: getBasename(this.source ? this.source.name! : ""),
            version: ""
        };
    }

    /**
     * Reads "META-INF/mods.toml" source metadata file.
     * @returns Minecraft metadata.
     */
    readModsTOML(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        const archive = new AdmZip(this.source.name);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("META-INF/mods.toml", (data) => {
                if(data === null) return reject(error("METADATA_BAD_SOURCE"));
                try {
                    const toml = Bun.TOML.parse(data.toString());
                    if("mods" in toml === false || !Array.isArray(toml.mods) || toml.mods.length === 0) return reject(error("METADATA_BAD_SOURCE"));
                    const mod = toml.mods[0] as object;
                    if("modId" in mod === false || "version" in mod === false) return reject(error("METADATA_BAD_SOURCE"));
                    return resolve({
                        authors: [ "authors" in mod ? mod["authors"] as string : "" ],
                        description: "description" in mod ? mod["description"] as string : "",
                        label: mod["modId"] as string,
                        name: "displayName" in mod ? mod["displayName"] as string : mod["modId"] as string,
                        version: mod["version"] as string
                    });
                }
                catch { return reject(error("METADATA_BAD_SOURCE")); }
            });
        });
    }

    /**
     * Reads "META-INF/neoforge.mods.toml" source metadata file.
     * @returns Minecraft metadata.
     */
    readNeoForgeModsTOML(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        const archive = new AdmZip(this.source.name);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("META-INF/neoforge.mods.toml", (data) => {
                if(data === null) return reject(error("METADATA_BAD_SOURCE"));
                try {
                    const toml = Bun.TOML.parse(data.toString());
                    if("mods" in toml === false || !Array.isArray(toml.mods) || toml.mods.length === 0) return reject(error("METADATA_BAD_SOURCE"));
                    const mod = toml.mods[0] as object;
                    if("modId" in mod === false || "version" in mod === false) return reject(error("METADATA_BAD_SOURCE"));
                    return resolve({
                        authors: [ "authors" in mod ? mod["authors"] as string : "" ],
                        description: "description" in mod ? mod["description"] as string : "",
                        label: mod["modId"] as string,
                        name: "displayName" in mod ? mod["displayName"] as string : mod["modId"] as string,
                        version: mod["version"] as string
                    });
                }
                catch { return reject(error("METADATA_BAD_SOURCE")); }
            });
        });
    }

    /**
     * Reads "pack.mcmeta" source metadata file.
     * @returns Minecraft metadata.
     */
    readPackMCMETA(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        const archive = new AdmZip(this.source.name);
        const filename = getBasename(this.source.name);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("pack.mcmeta", (data) => {
                if(data === null) return reject(error("METADATA_BAD_SOURCE"));
                try {
                    const json = JSON.parse(data.toString()) as object;
                    if("pack" in json === false || typeof json.pack !== "object" || json.pack === null) return reject(error("METADATA_BAD_SOURCE"));
                    const description = "description" in json.pack ? json.pack["description"] as string : "";
                    return resolve({
                        authors: [],
                        description: description,
                        label: "",
                        name: filename,
                        version: ""
                    });
                }
                catch { return reject(error("METADATA_BAD_SOURCE")); }
            });
        });
    }

    /**
     * Reads "paper-plugin.yml" source metadata file.
     * @returns Minecraft metadata.
     */
    readPaperPluginYML(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        const archive = new AdmZip(this.source.name);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("paper-plugin.yml", (data) => {
                if(data === null) return reject(error("METADATA_BAD_SOURCE"));
                try {
                    const yaml = Bun.YAML.parse(data.toString()) as object;
                    if("name" in yaml === false || "version" in yaml === false) return reject(error("METADATA_BAD_SOURCE"));
                    return resolve({
                        authors: [ "author" in yaml ? yaml["author"] as string : "" ],
                        description: "description" in yaml ? yaml["description"] as string : "",
                        label: "",
                        name: yaml["name"] as string,
                        version: yaml["version"] as string
                    });
                }
                catch { return reject(error("METADATA_BAD_SOURCE")); }
            });
        });
    }

    /**
     * Reads "plugin.yml" source metadata file.
     * @returns Minecraft metadata.
     */
    readPluginYML(): Promise<MinecraftMetadata> {
        // Reads source metadata file
        if(this.source === null || typeof this.source.name === "undefined") throw new Error(error("METADATA_NO_SOURCE"));
        const archive = new AdmZip(this.source.name);
        return new Promise<MinecraftMetadata>(async (resolve, reject) => {
            archive.readFileAsync("plugin.yml", (data) => {
                if(data === null) return reject(error("METADATA_BAD_SOURCE"));
                try {
                    const yaml = Bun.YAML.parse(data.toString()) as object;
                    if("name" in yaml === false || "version" in yaml === false) return reject(error("METADATA_BAD_SOURCE"));
                    return resolve({
                        authors: [ "author" in yaml ? yaml["author"] as string : "" ],
                        description: "description" in yaml ? yaml["description"] as string : "",
                        label: "",
                        name: yaml["name"] as string,
                        version: yaml["version"] as string
                    });
                }
                catch { return reject(error("METADATA_BAD_SOURCE")); }
            });
        });
    }

    /**
     * Relinks upstream string.
     * @returns Upstream string and Minecraft addon.
     */
    async relinkUpstream(commit: boolean = false): Promise<[ string, MinecraftAddon ]> {
        // Fetches upstream string
        if(this.source === null) throw new Error(error("RELINK_NO_SOURCE"));
        for(const registry of this.instance.registries) {
            try {
                const upstream = await registry.fetchUpstreamFromSource(this.source);
                if(commit) {
                    const hash = Bun.CryptoHasher.hash("sha1", await this.source.arrayBuffer()).toHex();
                    const pack = await this.instance.readPackJSON();
                    pack.addons[hash] = upstream;
                    await this.instance.writePackJSON(pack);
                }
                return [ upstream, new MinecraftAddon(this.instance, this.source, upstream) ];
            }
            catch {}
        }
        throw new Error(error("RELINK_NO_UPSTREAM"));
    }
}
