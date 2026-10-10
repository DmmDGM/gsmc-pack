// Imports
import { homedir as getHomeDirectory } from "node:os";
import { resolve as resolvePath } from "node:path";
import errors from "./errors.json";
import { version } from "../package.json";

/** Supported Minecraft loaders. */
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
    /** Built-in resourcepack loader. */
    RESOURCEPACK = "RESOURCEPACK",

    // Shaderpacks
    /** Iris shader loader. */
    IRIS = "IRIS",
    /** OptiFine shader loader. */
    OPTIFINE = "OPTIFINE",
    /** Built-in shader loader. */
    SHADERPACK = "SHADERPACK"
}

/** Supported Minecraft registries. */
export enum MinecraftRegistryEnum {
    /** Custom registry. */
    CUSTOM = "CUSTOM",
    /** CurseForge registry. */
    CURSEFORGE = "CURSEFORGE",
    /** Modrinth registry. */
    MODRINTH = "MODRINTH"
}

/** Supported Minecraft types. */
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

/** GSMC-Pack JSON. */
export interface GSMCPackJSON {
    /** Pack addons. */
    addons: Record<string, string>;
    /** Pack authors. */
    authors: string[];
    /** Pack description. */
    description: string;
    /** Preferred environment. */
    environment: MinecraftEnvironment;
    /** Pack name. */
    name: string;
    /** Pack version. */
    version: string;
}

/** Minecraft download. */
export interface MinecraftDownload {
    /** Download directory. */
    readonly directory: string;
    /**
     * Disposes download file.
     */
    readonly dispose: () => Promise<void>;
    /** Whether download has been disposed. */
    readonly disposed: boolean;
    /** Download promise. */
    readonly download: Promise<ArrayBuffer>;
    /** Download filename. */
    readonly filename: string;
    /** SHA-1 hash. */
    readonly hash: string;
    /**
     * Checks download progress.
     * @returns Download progress.
     */
    readonly progress: () => Promise<number>;
    /** Download size. */
    readonly size: number;
    /** Upstream string. */
    readonly upstream: string;
    /** Download URL. */
    readonly url: string;
}

/** Minecraft environment. */
export interface MinecraftEnvironment {
    /** Preferred mod / plugin loader. */
    readonly custompackLoader: MinecraftLoaderEnum;
    /** Preferred datapack loader. */
    readonly datapackLoader: MinecraftLoaderEnum;
    /** Preferred Minecraft version. */
    readonly minecraft: string;
    /** Preferred resourcepack loader. */
    readonly resourcepackLoader: MinecraftLoaderEnum;
    /** Preferred shaderpack loader. */
    readonly shaderpackLoader: MinecraftLoaderEnum;
}

/** Minecraft metadata. */
export interface MinecraftMetadata {
    /** Addon authors. */
    authors: string[];
    /** Addon internal codename. */
    code: string;
    /** Addon description. */
    description: string;
    /** Addon display name. */
    name: string;
    /** Addon version. */
    version: string;
}

/** Minecraft query. */
export interface MinecraftQuery {
    /** Overridden Minecraft loader. */
    loader: MinecraftLoaderEnum | null;
    /** Registry lookup. */
    lookup: string;
    /** Overridden Minecraft version. */
    minecraft: string | null;
    /** Upstream query. */
    query: string;
    /** Overridden Minecraft registry. */
    registry: MinecraftRegistryEnum | null;
    /** Overridden registry tag. */
    tag: string;
}

/** Minecraft upstream. */
export interface MinecraftUpstream {
    /** SHA-1 hash. */
    readonly hash: string;
    /** Unique registry ID. */
    readonly id: string;
    /** Supported Minecraft loaders. */
    readonly loaders: MinecraftLoaderEnum[];
    /** Supported Minecraft versions. */
    readonly minecrafts: string[];
    /** Minecraft registry. */
    readonly registry: MinecraftRegistryEnum;
    /** Unique registry tag. */
    readonly tag: string;
    /** Supported Minecraft types. */
    readonly types: MinecraftTypeEnum[];
    /** Download URL. */
    readonly url: string;
}

/** Default GSMC-Pack JSON. */
export const DEFAULT_GSMCPACK_JSON: GSMCPackJSON = {
    addons: {},
    authors: [],
    description: "",
    environment: {
        custompackLoader: MinecraftLoaderEnum.DATAPACK,
        datapackLoader: MinecraftLoaderEnum.DATAPACK,
        minecraft: "26.3",
        resourcepackLoader: MinecraftLoaderEnum.RESOURCEPACK,
        shaderpackLoader: MinecraftLoaderEnum.SHADERPACK
    },
    name: "",
    version: ""
};

/** GSMC-Pack build version. */
export const GSMCPACK_BUILD = version;

/** GSMC-Pack errors. */
export const GSMCPACK_ERRORS = errors;

/** Minecraft loader to type map. */
export const MINECRAFT_LOADER_TYPE_MAP: Record<MinecraftLoaderEnum, MinecraftTypeEnum> = {
    // Datapacks
    /** Built-in datapack loader type. */
    [ MinecraftLoaderEnum.DATAPACK ]: MinecraftTypeEnum.DATAPACK,

    // Mods
    /** Fabric mod loader type. */
    [ MinecraftLoaderEnum.FABRIC ]: MinecraftTypeEnum.MOD,
    /** Forge mod loader type. */
    [ MinecraftLoaderEnum.FORGE ]: MinecraftTypeEnum.MOD,
    /** NeoForge mod loader type. */
    [ MinecraftLoaderEnum.NEOFORGE ]: MinecraftTypeEnum.MOD,
    /** Quilt mod loader type. */
    [ MinecraftLoaderEnum.QUILT ]: MinecraftTypeEnum.MOD,

    // Plugins
    /** Bukkit plugin loader type. */
    [ MinecraftLoaderEnum.BUKKIT ]: MinecraftTypeEnum.PLUGIN,
    /** Paper plugin loader type. */
    [ MinecraftLoaderEnum.PAPER ]: MinecraftTypeEnum.PLUGIN,
    /** Purpur plugin loader type. */
    [ MinecraftLoaderEnum.PURPUR ]: MinecraftTypeEnum.PLUGIN,
    /** Spigot plugin loader type. */
    [ MinecraftLoaderEnum.SPIGOT ]: MinecraftTypeEnum.PLUGIN,

    // Resourcepacks
    /** Built-In resourcepack loader type. */
    [ MinecraftLoaderEnum.RESOURCEPACK ]: MinecraftTypeEnum.RESOURCEPACK,

    // Shaderpacks
    /** Iris shader loader type. */
    [ MinecraftLoaderEnum.IRIS ]: MinecraftTypeEnum.SHADERPACK,
    /** OptiFine shader loader type. */
    [ MinecraftLoaderEnum.OPTIFINE ]: MinecraftTypeEnum.SHADERPACK,
    /** Built-In shader loader type. */
    [ MinecraftLoaderEnum.SHADERPACK ]: MinecraftTypeEnum.SHADERPACK
};

/** Minecraft type to loaders map. */
export const MINECRAFT_TYPE_LOADERS_MAP: Record<MinecraftTypeEnum, MinecraftLoaderEnum[]> = {
    /** Datapack loaders. */
    [ MinecraftTypeEnum.DATAPACK ]: [
        MinecraftLoaderEnum.DATAPACK
    ],
    /** Mod loaders. */
    [ MinecraftTypeEnum.MOD ]: [
        MinecraftLoaderEnum.FABRIC,
        MinecraftLoaderEnum.FORGE,
        MinecraftLoaderEnum.NEOFORGE,
        MinecraftLoaderEnum.QUILT,
    ],
    /** Plugin loaders. */
    [ MinecraftTypeEnum.PLUGIN ]: [
        MinecraftLoaderEnum.BUKKIT,
        MinecraftLoaderEnum.PAPER,
        MinecraftLoaderEnum.PURPUR,
        MinecraftLoaderEnum.SPIGOT,
    ],
    /** Resourcepack loaders. */
    [ MinecraftTypeEnum.RESOURCEPACK]: [
        MinecraftLoaderEnum.RESOURCEPACK
    ],
    /** Shaderpack loaders. */
    [ MinecraftTypeEnum.SHADERPACK ]: [
        MinecraftLoaderEnum.SHADERPACK
    ]
};

/**
 * Formats error message with dynamic values.
 * @param code Error code.
 * @param values Dynamic values.
 * @returns Error message.
 */
export function error(code: keyof typeof errors, values: Record<string, unknown> = {}): string {
    // Format error
    const message = errors[code] ?? `This is a fallback error message. Error code '${code}' does not exist.`;
    return message.replaceAll(/\$(\w+)/g, (match, value) => value in values ? String(values[value]) : match);
}

/**
 * Reads '~/.gsmc-pack/curse-forge.key' file.
 * @returns CurseForge API key.
 */
export async function readCurseForgeAPIKey(): Promise<string> {
    // Reads key
    const filepath = resolvePath(getHomeDirectory(), "./.gsmc-pack/curse-forge.key");
    try { return await Bun.file(filepath).text(); }
    catch { throw new Error(error("NO_KEY", { filepath })); }
}
