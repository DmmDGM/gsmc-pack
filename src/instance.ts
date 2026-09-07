// Imports
import nodeFs from "node:fs/promises";
import nodePath from "node:path";
import { GenericMinecraftMod } from "./mod";

/** A representation of a Minecraft instance. */
export class MinecraftInstance {
    /** The path to this instance. */
    readonly instancePath: string;

    /**
     * Creates a new Minecraft instance representation.
     * @param instancePath The path to this instance.
     */
    constructor(instancePath: string) {    
        // Initializes class
        this.instancePath = instancePath;
    }

    /**
     * Reads the 'mods' directory of this instance.
     * @returns An array of this instance's mods.
     */
    async readModsDirectory(): Promise<GenericMinecraftMod[]> {
        try {
            // Reads 'mods' directory if exists
            const modFiles = await nodeFs.readdir(nodePath.join(this.instancePath, "mods"));
            return modFiles.map((modFile) => new GenericMinecraftMod(nodePath.join(this.instancePath, "mods", modFile)));
        }
        catch {
            // Returns empty array as fallback
            return [];
        }
    }
}
