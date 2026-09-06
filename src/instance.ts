// Imports
import nodeFs from "node:fs/promises";
import nodePath from "node:path";
import { MinecraftMod } from "./mod";

/** Represents a Minecraft instance. */
export class MinecraftInstance {
    /** The path to this Minecraft instance. */
    readonly instancePath: string;

    /**
     * Creates a new Minecraft instance representation.
     * @param instancePath The path to this Minecraft instance.
     */
    constructor(instancePath: string) {    
        // Initializes class
        this.instancePath = instancePath;
    }

    /**
     * Reads this instance's 'mods' directory.
     * @returns An array of Minecraft mods.
     */
    async readModsDirectory(): Promise<MinecraftMod[]> {
        try {
            // Check 'mods' directory if available
            const modFiles = await nodeFs.readdir(nodePath.join(this.instancePath, "mods"));
            return modFiles.map((modFile) => new MinecraftMod(nodePath.join(this.instancePath, "mods", modFile)));
        }
        catch {
            // Returns empty array as fallback
            return [];
        }
    }
}
