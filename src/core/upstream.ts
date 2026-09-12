import { MinecraftAddonRegistry } from "./registries";

/** Represents a Minecraft addon upstream. */
export interface MinecraftAddonUpstream {
    /** The timestamp in milliseconds in which this addon is published. */
    date: number;

    /** The file name of this addon.  */
    file: string;

    /** The sha1 file hash of this addon. */
    hash: string;

    /** The major registry pointer to this addon. */
    major: string | number;

    /** The Minecraft version of this addon. */
    minecrafts: string[];
    
    /** The minor registry pointer to this addon. */
    minor: string | number;

    /** The registry of this upstream. */
    registry: MinecraftAddonRegistry;

    /** The download URL to this addon. */
    url: string;
}
