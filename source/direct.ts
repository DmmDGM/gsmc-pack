// Imports
import nodePath from "node:path";
import NodeCache from "node-cache";
import Source from "../library/source";
import { cfetch } from "../library/internet";

// Defines direct source
export class Direct implements Source {
    // Defines cache
    static readonly cache = new NodeCache();

    // Defines source fields
    readonly origin: string;
    readonly label: string;
    readonly type: string;
    readonly url: string;
    readonly as: string;

    // Defines constructor
    constructor(origin: string, label: string, type: string, url: string, as: string) {
        // Updates source fields
        this.origin = origin;
        this.label = label;
        this.type = type;
        this.url = url;
        this.as = as;
    }

    // Defines helper methods
    async bytes(): Promise<Uint8Array<ArrayBuffer> | null> {
        // Creates request
        const url = new URL(this.url);
        const request = new Request(url);

        // Creates response
        const response = await cfetch(request);
        if(!response.ok) return null;

        // Creates bytes
        const bytes = await response.bytes();
        return bytes;
    }

    // Defines souce methods
    async dep(pack: Pack): Promise<boolean> {
        // Skips dep
        hint(`Origin ${glow(this.origin)} is a direct source, skipping sync.`);
        return true;
    }
    async sync(pack: Pack): Promise<boolean> {
        // Checks file
        const file = Bun.file(nodePath.resolve(pack.flags["pack-directory"], this.as));
        if(!flags["force-sync"] && await file.exists()) {
            hint(`Origin ${glow(this.origin)} already exists, skipping sync.`);
            return true;
        }

        // Creates response
        const response = await fetch(this.url);
        if(!response.ok) {
            fail(`Failed to sync origin ${glow(this.origin)}, leads to a corrupted url.`);
            return false;
        }

        // Writes file
        const bytes = await response.bytes();
        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
        await file.write(bytes);

        // Prints result
        pass(`Origin ${glow(this.origin)} synced, file size ${glow(size)} MiB.`);
        return true;
    }
    async test(pack: Pack): Promise<boolean> {
        // Checks response
        const response = await fetch(this.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${glow(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Prints result
        pass(`Origin ${glow(this.origin)} passes, resource is reachable.`);
        return true;
    }
}

// Exports
export default Direct;
