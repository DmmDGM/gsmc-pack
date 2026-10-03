// Imports
import { MinecraftAddon } from "../minecraft-addon";
import { error } from "../common/error";

/** Minecraft unknown addon. */
export class MinecraftUnknown extends MinecraftAddon {
    /**
     * Throws unknown error.
     */
    getDownloadDirectory(): never {
        // Throws error
        throw new Error(error("DOWNLOAD_BAD_UPSTREAM"));
    }

    /**
     * Fetches upstream string from source.
     * @returns Addon upstream string.
     */
    async fetchUpstreamFromSource(): Promise<string> {
        // Fetches upstream string
        for(const registry of this.instance.registries) {
            try {
                return await registry.fetchUpstreamFromSource(this.source!);
            }
            catch {}
        }
        throw new Error(error("SOURCE_NO_UPSTREAM"));
    }
}
