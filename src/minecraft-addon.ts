// Imports
import type { MinecraftInstance } from "./minecraft-instance";
import { mkdtemp as makeTemporaryDirectory, rmdir as removeDirectory} from "node:fs/promises";
import { tmpdir as getTemporaryDirectory } from "node:os";
import { resolve as resolvePath } from "node:path";
import { MinecraftRegistry } from "./minecraft-registry";
import { error } from "./common/error";

/** Minecraft addon. */
export abstract class MinecraftAddon {
    /** Minecraft instance of addon. */
    readonly instance: MinecraftInstance;
    /** Source file of addon. */
    readonly source: Bun.BunFile | null;
    /** Upstream string of addon. */
    readonly upstream: string | null;

    /**
     * Creates new Minecraft addon.
     * @param instance Minecraft instance of addon.
     * @param source Source file of addon.
     * @param upstream Upstream string of addon.
     */
    constructor(instance: MinecraftInstance, source: Bun.BunFile | null, upstream: string | null) {
        // Inits fields
        this.instance = instance;
        this.source = source;
        this.upstream = upstream;
    }

    /**
     * Downloads addon.
     * @returns Downloaded addon.
     */
    async downloadAddon(): Promise<MinecraftAddon> {
        // Parses hash and URL
        if(this.upstream === null) throw new Error(error("DOWNLOAD_NO_UPSTREAM"));
        const upstream = MinecraftRegistry.loadUpstream(this.upstream);
        const hash = upstream[6];
        const url = upstream[7];

        // Makes request
        const response = await fetch(url);
        if(!response.ok) throw new Error(error("DOWNLOAD_BAD_UPSTREAM"));

        // Downloads file
        const filename = decodeURI(response.url.split("/").pop()!);
        const tempDirectory = await makeTemporaryDirectory(resolvePath(getTemporaryDirectory(), "gsmc-pack-"));
        const downloadFile = Bun.file(resolvePath(tempDirectory, filename));
        try {
            // Writes response
            await downloadFile.write(response);

            // Verifies hash
            const downloadHash = Bun.CryptoHasher.hash("sha1", await downloadFile.arrayBuffer()).toHex();
            if(hash !== downloadHash) throw new Error(error("DOWNLOAD_BAD_UPSTREAM"));
            
            // Commits transaction
            const directory = this.getDownloadDirectory();
            const file = Bun.file(resolvePath(directory, filename));
            await file.write(downloadFile);
            return this.instance.castMinecraftAddon(file, this.upstream);
        }
        finally {
            // Cleans up
            await downloadFile.unlink();
            await removeDirectory(tempDirectory);
        }
    }

    /**
     * Estimates size of download file.
     * @returns Size of download file.
     */
    async pingUpstream(): Promise<number> {
        // Parses URL
        if(this.upstream === null) throw new Error(error("PING_NO_UPSTREAM"));
        const upstream = MinecraftRegistry.loadUpstream(this.upstream);
        const url = upstream[7];

        // Makes request
        const response = await fetch(url, { method: "HEAD" });
        if(!response.ok) throw new Error(error("PING_BAD_UPSTREAM"));
        
        // Parses size
        const size = Number(response.headers.get("content-length"));
        if(isNaN(size)) throw new Error(error("PING_BAD_UPSTREAM"));
        return size;
    }

    // Declares abstract methods
    abstract getDownloadDirectory(): string;
}
