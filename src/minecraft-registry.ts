// Imports
import { mkdtemp as makeTemporaryDirectory } from "node:fs/promises";
import { tmpdir as getTemporaryDirectory } from "node:os";
import { resolve as resolvePath } from "node:path";
import { error } from "./error";
import { MinecraftDownload } from "./minecraft-download";

/** Supported Minecraft loaders in GSMC-Pack. */
export enum MinecraftLoaderEnum {
    // Datapacks
    /** Built-in datapack loader. */
    DATAPACK = "DATAPACK",

    // Mods
    /** Fabric mod loader. */
    FABRIC = "FABRIC",
    /** Forge mod loader. */
    FORGE = "FORGE",
    /** NeoForge mod loader. */
    NEOFORGE = "NEOFORGE",
    /** Quilt mod loader. */
    QUILT = "QUILT",

    // Plugins
    /** Bukkit plugin loader. */
    BUKKIT = "BUKKIT",
    /** Paper plugin loader. */
    PAPER = "PAPER",
    /** Purpur plugin loader. */
    PURPUR = "PURPUR",
    /** Spigot plugin loader. */
    SPIGOT = "SPIGOT",

    // Resourcepacks
    /** Built-In resourcepack loader. */
    MINECRAFT = "MINECRAFT",

    // Shaderpacks
    /** Iris shader loader. */
    IRIS = "IRIS",
    /** OptiFine shader loader. */
    OPTIFINE = "OPTIFINE",
    /** Built-In shader loader. */
    VANILLA = "VANILLA"
}

/** Supported Minecraft registries in GSMC-Pack. */
export enum MinecraftRegistryEnum {
    /** CurseForge registry. */
    CURSEFORGE = "CURSEFORGE",
    /** Modrinth registry. */
    MODRINTH = "MODRINTH"
}

/** Supported Minecraft types in GSMC-Pack. */
export enum MinecraftTypeEnum {
    /** Datapack addon. */
    DATAPACK = "DATAPACK",
    /** Mod addon. */
    MOD = "MOD",
    /** Plugin addon. */
    PLUGIN = "PLUGIN",
    /** Resourcepack addon. */
    RESOURCEPACK = "RESOURCEPACK",
    /** Shaderpack addon. */
    SHADERPACK = "SHADERPACK"
}

/** Minecraft Environment. */
export interface MinecraftEnvironment {
    /** Preferred datapack loader. */
    datapackLoader: MinecraftLoaderEnum;
    /** Preferred Minecraft version. */
    minecraft: string;
    /** Preferred mod loader. */
    modLoader: MinecraftLoaderEnum;
    /** Preferred plugin loader. */
    pluginLoader: MinecraftLoaderEnum;
    /** Preferred resourcepack loader. */
    resourcepackLoader: MinecraftLoaderEnum;
    /** Preferred shaderpack loader. */
    shaderpackLoader: MinecraftLoaderEnum;
}

/** Minecraft upstream. */
export interface MinecraftUpstream {
    /** SHA-1 hash. */
    hash: string;
    /** Unique registry ID. */
    id: string;
    /** Supported Minecraft loaders. */
    loaders: MinecraftLoaderEnum[];
    /** Supported Minecraft versions. */
    minecrafts: string[];
    /** Minecraft registry. */
    registry: MinecraftRegistryEnum;
    /** Unique registry tag. */
    tag: string;
    /** Supported Minecraft types. */
    types: MinecraftTypeEnum[];
    /** Download URL. */
    url: string;
}

/** Minecraft registry. */
export abstract class MinecraftRegistry {
    /**
     * Downloads source file from upstream string.
     * @param upstream Upstream string.
     * @returns Minecraft download.
     */
    static async downloadSource(upstream: string): Promise<MinecraftDownload> {
        // Loads upstream
        const { hash, url } = MinecraftRegistry.loadUpstream(upstream);

        // Makes request
        const response = await fetch(url);
        if(!response.ok) throw new Error(error("DOWNLOAD_BAD_UPSTREAM"));

        // Creates download
        const filename = decodeURI(response.url).split("/").pop()!;
        const directory = await makeTemporaryDirectory(resolvePath(getTemporaryDirectory(), "gsmc-pack-"));
        const file = Bun.file(resolvePath(directory, filename));
        return new MinecraftDownload(file, directory, filename, hash, response);
    }

    /**
     * Creates upstream string from upstream.
     * @param upstream Upstream.
     * @returns Upstream string.
     */
    static dumpUpstream({ hash, id, minecrafts, loaders, registry, tag, types, url }: MinecraftUpstream): string {
        // Creates upstream string
        return [ registry, minecrafts.join(";"), types.join(";"), loaders.join(";"), id, tag, hash, url ].join("::");
    }

    /**
     * Estimates download size of source file.
     * @param upstream Upstream string.
     * @returns Download size.
     */
    static async estimateSource(upstream: string): Promise<number> {
        // Loads upstream
        const { url } = MinecraftRegistry.loadUpstream(upstream);

        // Makes request
        const response = await fetch(url, { method: "HEAD" });
        if(!response.ok) throw new Error(error("ESTIMATE_BAD_UPSTREAM"));

        // Estimates size
        const size = Number(response.headers.get("content-length"));
        if(isNaN(size)) throw new Error(error("ESTIMATE_BAD_UPSTREAM"));
        return size;
    }

    /**
     * Creates upstream from upstream string.
     * @param upstream Upstream string.
     * @returns Upstream.
     */
    static loadUpstream(upstream: string): MinecraftUpstream {
        // Creates upstream
        const [ registry, _minecrafts, _types, _loaders, id, tag, hash, url ] = upstream.split("::");
        const loaders = _loaders.split(";") as MinecraftLoaderEnum[];
        const minecrafts = _minecrafts.split(";");
        const types = _types.split(";") as MinecraftTypeEnum[];
        return { hash, loaders, minecrafts, id, registry: registry as MinecraftRegistryEnum, tag, types, url };
    }

    /**
     * Loads upstream best type from upstream string.
     * @param upstream Upstream string.
     * @returns Upstream type.
     */
    static loadUpstreamBestType(upstream: string): MinecraftTypeEnum {
        // Loads upstream
        const { types } = MinecraftRegistry.loadUpstream(upstream);
        
        // Loads upstream type
        if(types.includes(MinecraftTypeEnum.MOD)) return MinecraftTypeEnum.MOD;
        if(types.includes(MinecraftTypeEnum.SHADERPACK)) return MinecraftTypeEnum.SHADERPACK;
        if(types.includes(MinecraftTypeEnum.RESOURCEPACK)) return MinecraftTypeEnum.RESOURCEPACK;
        if(types.includes(MinecraftTypeEnum.PLUGIN)) return MinecraftTypeEnum.PLUGIN;
        if(types.includes(MinecraftTypeEnum.DATAPACK)) return MinecraftTypeEnum.DATAPACK;
        throw new Error(error("LOAD_BAD_UPSTREAM"));
    }

    /**
     * Checks whether upstream string satisfies Minecraft environment.
     * @param upstream Upstream string.
     * @param environment Minecraft environment.
     * @returns Whether upstream string satisfies Minecraft environment.
     */
    static satisfiesEnvironment(upstream: string, environment: MinecraftEnvironment): boolean {
        // Checks Minecrafts
        const { loaders, minecrafts } = MinecraftRegistry.loadUpstream(upstream);
        if(!minecrafts.includes(environment.minecraft)) return false;

        // Checks loaders
        const type = MinecraftRegistry.loadUpstreamBestType(upstream);
        switch(type) {
            case MinecraftTypeEnum.DATAPACK: return loaders.includes(environment.datapackLoader);
            case MinecraftTypeEnum.MOD: return loaders.includes(environment.modLoader);
            case MinecraftTypeEnum.PLUGIN: return loaders.includes(environment.pluginLoader);
            case MinecraftTypeEnum.RESOURCEPACK: return loaders.includes(environment.resourcepackLoader);
            case MinecraftTypeEnum.SHADERPACK: return loaders.includes(environment.shaderpackLoader);
        }
    }

    // Declares abstract methods
    abstract readonly type: MinecraftRegistryEnum;
    abstract fetchIDFromSlug(slug: string): Promise<string>;
    abstract fetchUpstreamFromSource(source: Bun.BunFile): Promise<string>;
    abstract fetchUpstreamFromTag(id: string, tag: string): Promise<string>;
    abstract fetchUpstreamsFromID(minecraft: string, id: string): Promise<string[]>;
}
