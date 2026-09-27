// Imports
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "../minecraft-addon";

/** Minecraft shaderpack. */
export class MinecraftShaderpack extends MinecraftAddon {
    /**
     * Gets shaderpack directory.
     * @returns Shaderpack directory.
     */
    getDownloadDirectory(): string {
        // Returns directory
        return resolvePath(this.instance.path, "shaderpacks");
    }
}
