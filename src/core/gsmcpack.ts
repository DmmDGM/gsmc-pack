// Imports
import { MinecraftAddonFlavor } from "./flavor";
import { MinecraftAddonMetadata } from "./metadata";
import { MinecraftAddonType } from "./type";

/** Represents the 'gsmc-pack.json' file. */
export interface GSMCPack {
    /** A list of this pack's addons. */
    addons: { [ Hash in string ]: MinecraftAddonMetadata; };

    /** The authors who made this pack. */
    authors: string[];

    /** The description about this pack. */
    description: string;

    /** The preferred environment for this pack. */
    environment: { [ Type in MinecraftAddonType ]: MinecraftAddonFlavor; };

    /** The Minecraft version for this pack. */
    minecraft: string;

    /** The name of this pack. */
    name: string;

    /** The schema version of this 'gsmc-pack.json' file. */
    schema: number;

    /** Whether this pack is for server-side instead. */
    server: boolean;

    /** The version of this pack. */
    version: string;
}
