// Imports
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "../minecraft-addon";

/** Minecraft mod. */
export class MinecraftMod extends MinecraftAddon {
    /**
     * Gets mod directory.
     * @returns Mod directory.
     */
    getDownloadDirectory(): string {
        // Returns directory
        return resolvePath(this.instance.path, "mods");
    }
}
