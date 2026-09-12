/** A list of supported Minecraft addon types. */
export enum MinecraftAddonType {
    /** Represents a [datapack](https://minecraft.wiki/w/Data_pack) type. */
    DATA_PACK = "DATA_PACK",

    /** Represents a [mod](https://minecraft.wiki/w/Mod) type. */
    MOD = "MOD",

    /** Represents a [plugin](https://minecraft.wiki/w/Mod#Server-based) type. */
    PLUGIN = "PLUGIN",

    /** Represents a [resource pack](https://minecraft.wiki/w/Resource_pack) type. */
    RESOURCE_PACK = "RESOURCE_PACK",

    /** Represents a [shader pack](https://minecraft.wiki/w/Mod#Shader_pack) type. */
    SHADER_PACK = "SHADER_PACK",

    /** Represents a [texture pack](https://minecraft.wiki/w/Texture_pack) (aka. legacy resource pack) type. */
    TEXTURE_PACK = "TEXTURE_PACK"
}
