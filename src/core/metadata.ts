// Imports
import { MinecraftAddonFlavor } from "./flavor";
import { MinecraftAddonType } from "./type";

/** Represents a Minecraft addon metadata. */
export interface MinecraftAddonMetadata {
    /** The flavor (environment / platform) of this addon. */
    flavor: MinecraftAddonFlavor;

    /** The ID of this addon. */
    id: string;

    /** The name of this addon.  */
    name: string;

    /** The path to this addon.  */
    path: string;

    /** The type (category) of this addon. */
    type: MinecraftAddonType;

    /** The download and reference upstream of this addon. */
    upstream: string;

    /** The version of this addon. */
    version: string;
}
