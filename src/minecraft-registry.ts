/** Supported addon loaders in GSMC-Pack. */
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
    SHADERPACK = "SHADERPACK",
    /** Unknown addon. */
    UNKNOWN = "UNKNOWN"
}

/** Addon upstream. */
export interface MinecraftUpstream {
    /** SHA-1 hash of addon. */
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
    /** Download URL of addon. */
    url: string;
}

/** Minecraft registry. */
export abstract class MinecraftRegistry {
    /**
     * Creates upstream string from upstream.
     * @param upstream Addon upstream.
     * @returns Addon upstream string.
     */
    static dumpUpstream({ hash, id, minecrafts, loaders, registry, tag, types, url }: MinecraftUpstream): string {
        // Creates upstream string
        return [ registry, minecrafts.join(";"), types.join(";"), loaders.join(";"), id, tag, hash, url ].join("::");
    }

    /**
     * Infers best upstream type from upstream string.
     * @param upstream Addon upstream string.
     * @returns Addon upstream type.
     */
    static inferBestUpstreamType(upstream: string): MinecraftTypeEnum {
        // Parses type
        const { types } = MinecraftRegistry.loadUpstream(upstream);
        if(types.includes(MinecraftTypeEnum.MOD)) return MinecraftTypeEnum.MOD;
        if(types.includes(MinecraftTypeEnum.SHADERPACK)) return MinecraftTypeEnum.SHADERPACK;
        if(types.includes(MinecraftTypeEnum.RESOURCEPACK)) return MinecraftTypeEnum.RESOURCEPACK;
        if(types.includes(MinecraftTypeEnum.PLUGIN)) return MinecraftTypeEnum.PLUGIN;
        if(types.includes(MinecraftTypeEnum.DATAPACK)) return MinecraftTypeEnum.DATAPACK;
        return MinecraftTypeEnum.UNKNOWN;
    }

    /**
     * Creates upstream from upstream string.
     * @param upstream Addon upstream string.
     * @returns Addon upstream.
     */
    static loadUpstream(upstream: string): MinecraftUpstream {
        // Creates upstream
        const [ registry, _minecrafts, _types, _loaders, id, tag, hash, url ] = upstream.split("::");
        const loaders = _loaders.split(";") as MinecraftLoaderEnum[];
        const minecrafts = _minecrafts.split(";");
        const types = _types.split(";") as MinecraftTypeEnum[];
        return { hash, loaders, minecrafts, id, registry: registry as MinecraftRegistryEnum, tag, types, url };
    }

    // Declares abstract methods
    abstract fetchIDFromSlug(slug: string): Promise<string>;
    abstract fetchUpstreamFromSource(source: Bun.BunFile): Promise<string>;
    abstract fetchUpstreamFromTag(id: string, tag: string): Promise<string>;
    abstract fetchUpstreamsFromID(minecraft: string, id: string): Promise<string[]>;
}
