// Imports
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "../minecraft-addon";

/** Minecraft plugin. */
export class MinecraftPlugin extends MinecraftAddon {
    /**
     * Gets plugin directory.
     * @returns Plugin directory.
     */
    getDownloadDirectory(): string {
        // Returns directory
        return resolvePath(this.instance.path, "plugins");
    }
}
