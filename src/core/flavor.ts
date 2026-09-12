/** A list of supported Minecraft addon flavors. */
export enum MinecraftAddonFlavor {
    /** Represents the [Fabric](https://fabricmc.net/) mod loader. */
    FABRIC = "FABRIC",

    /** Represents the [Forge](https://files.minecraftforge.net) mod loader. */
    FORGE = "FORGE",

    /** Represents the [NeoForge](https://neoforged.net/) mod loader. */
    NEO_FORGE = "NEO_FORGE",
    
    /** Represents ambiguous / universal Minecraft loader. */
    UNKNOWN = "UNKNOWN",
    
    /** Represents the default Minecraft loader. */
    VANILLA = "VANILLA"
}
