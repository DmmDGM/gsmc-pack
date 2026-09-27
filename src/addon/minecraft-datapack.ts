// Imports
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "../minecraft-addon";

/** Minecraft datapack. */
export class MinecraftDatapack extends MinecraftAddon {
    /**
     * Gets datapack directory.
     * @returns Datapack directory.
     */
    getDownloadDirectory(): string {
        // Returns directory
        return resolvePath(this.instance.path, "data");
    }
}
