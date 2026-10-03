// Imports
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "../minecraft-addon";

/** Minecraft resourcepack. */
export class MinecraftResourcepack extends MinecraftAddon {
    /**
     * Gets resourcepack directory.
     * @returns Resourcepack directory.
     */
    getDownloadDirectory(): string {
        // Returns directory
        return resolvePath(this.instance.path, "resourcepacks");
    }

    /**
     * Fetches known upstream string.
     * @returns Addon upstream string.
     */
    async fetchUpstreamFromSource(): Promise<string> {
        // Returns upstream string
        return this.upstream!;
    }
}
