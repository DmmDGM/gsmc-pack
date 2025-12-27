// Imports
import nodePath from "node:path";
import { fail, glow, hint, pass } from "./pretty";
import { flags } from "./runtime";

// Defines direct source
export class Direct implements Source {
    // Defines source fields
    readonly origin: string;
    readonly label: string;
    readonly url: string;
    readonly as: string;
    readonly type: string;

    // Defines constructor
    constructor(origin: string, label: string, url: string, as: string, type: string) {
        // Updates source fields
        this.origin = origin;
        this.label = label;
        this.url = url;
        this.as = as;
        this.type = type;
    }

    // Defines souce methods
    async dep(): Promise<boolean> {
        // Skips dep
        hint(`Origin ${glow(this.origin)} is a direct source, skipping sync.`);
        return true;
    }
    async sync(): Promise<boolean> {
        // Checks file
        const file = Bun.file(nodePath.resolve(flags["pack-directory"], this.as));
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
    async test(): Promise<boolean> {
        // Checks response
        const response = await fetch(this.url, { method: "HEAD" });
        if(!response.ok) {
            fail(`Origin ${glow(this.origin)} fails, leads to a corrupted url.`);
            return false;
        }

        // Prints result
        pass(`Origin ${glow(this.origin)} passes, resource reachable.`);
        return true;
    }
}

// Exports
export default Direct;
