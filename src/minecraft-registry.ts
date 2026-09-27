// Imports
import { error } from "./common/error";

/** Supported addon loaders in GSMC-Pack. */
export enum MinecraftLoaderEnum {
    // Datapacks
    /** Built-In datapack loader. */
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

/** Supported addon registries in GSMC-Pack. */
export enum MinecraftRegistryEnum {
    /** CurseForge registry. */
    CURSEFORGE = "CURSEFORGE",
    /** Modrinth registry. */
    MODRINTH = "MODRINTH"
}

/** Supported addon types in GSMC-Pack. */
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

/** Addon upstream. */
export type MinecraftUpstream = [
    registry: MinecraftRegistryEnum,
    minecrafts: string[],
    types: MinecraftTypeEnum[],
    loaders: MinecraftLoaderEnum[],
    id: string,
    tag: string,
    hash: string,
    url: string
];

/** Minecraft registry. */
export abstract class MinecraftRegistry {
    /**
     * Creates upstream string from upstream.
     * @param upstream Addon upstream.
     * @returns Addon upstream string.
     */
    static dumpUpstream(...[ registry, _minecrafts, _types, _loaders, id, tag, hash, url ]: MinecraftUpstream): string {
        // Creates upstream string
        return [ registry, _minecrafts.join(";"), _types.join(";"), _loaders.join(";"), id, tag, hash, url ].join("::");
    }

    /**
     * Creates upstream from upstream string.
     * @param upstream Addon upstream string.
     * @returns Addon upstream.
     */
    static loadUpstream(upstream: string): MinecraftUpstream {
        // Creates upstream
        const [ registry, _minecrafts, _types, _loaders, id, tag, hash, url ] = upstream.split("::");
        return [ registry, _minecrafts.split(";"), _types.split(";"), _loaders.split(";"), id, tag, hash, url ] as MinecraftUpstream;
    }

    /**
     * Parses most relevant type from upstream string.
     * @param upstream Addon upstream string.
     * @returns Addon upstream type.
     */
    static parseUpstreamType(upstream: string): MinecraftTypeEnum {
        // Parses type
        const types = MinecraftRegistry.loadUpstream(upstream)[2];
        if(types.includes(MinecraftTypeEnum.MOD)) return MinecraftTypeEnum.MOD;
        if(types.includes(MinecraftTypeEnum.SHADERPACK)) return MinecraftTypeEnum.SHADERPACK;
        if(types.includes(MinecraftTypeEnum.RESOURCEPACK)) return MinecraftTypeEnum.RESOURCEPACK;
        if(types.includes(MinecraftTypeEnum.PLUGIN)) return MinecraftTypeEnum.PLUGIN;
        if(types.includes(MinecraftTypeEnum.DATAPACK)) return MinecraftTypeEnum.DATAPACK;
        throw new Error(error("PARSE_BAD_UPSTREAM"));
    }

    // Declares abstract methods
    abstract fetchIDFromSlug(slug: string): Promise<string>;
    abstract fetchUpstreamFromSource(source: Bun.BunFile): Promise<string>;
    abstract fetchUpstreamFromTag(id: string, tag: string): Promise<string>;
    abstract fetchUpstreamsFromID(minecraft: string, id: string): Promise<string[]>;
}
