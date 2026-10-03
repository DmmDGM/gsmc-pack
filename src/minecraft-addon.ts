// Imports
import type { MinecraftDownload } from "./minecraft-download";
import type { MinecraftInstance } from "./minecraft-instance";
import { resolve as resolvePath } from "node:path";
import { error } from "./error";
import { MinecraftRegistry, MinecraftTypeEnum } from "./minecraft-registry";

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
                const directory = this.getDirectory();
                const source = commit ? await download.writeFile(directory) : this.source;
                await download.disposeDownload();
                return resolve(new MinecraftAddon(this.instance, source, this.upstream));
            }
            catch(reason) { return reject(reason); }
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
     * @returns Addon directory.
     */
    getDirectory(): string {
        // Gets directory
        if(this.upstream === null) throw new Error(error("INFER_NO_UPSTREAM"));
        const type = MinecraftRegistry.loadUpstreamBestType(this.upstream);
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
