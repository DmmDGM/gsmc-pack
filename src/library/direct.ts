// Imports
import nodePath from "node:path";
import { fsync, packd } from "./common";
import Packet from "./packet";
import { bad, glow, good, hint } from "../../pretty";

// Defines class
export class Direct implements Packet {
    // Defines upstream fields
    readonly flags: Set<string>;
    readonly upstream: string;
    readonly values: string[];

    // Defines data fields
    readonly file: string;
    readonly label: string;
    readonly url: string;

    // Defines constructor
    constructor(upstream: string, values: string[], flags: Set<string>) {
        // Updates upstream fields
        this.flags = flags;
        this.upstream = upstream;
        this.values = values;
                
        // Updates data fields
        if(this.values.length < 4 || this.values[0] !== "direct")
            throw new Error(`Invalid upstream ${glow(this.upstream)}, expects ${glow("direct;$LABEL;$URL;$FILE")}.`);
        [ this.label, this.url, this.file ] = this.values.slice(1);
    }

    // Defines api methods
    async sync(): Promise<void> {
        // Checks nosync
        if(this.flags.has("nosync")) {
            hint(`Upstream ${glow(this.upstream)} has flag ${glow("nosync")}, skipping sync.`);
            return;
        }

        // Loads file
        const file = Bun.file(nodePath.resolve(packd, this.file));

        // Checks fsync
        if(await file.exists() && !fsync) {
            hint(`Upstream ${glow(this.upstream)} already exists, skipping sync.`);
            return;
        }
        
        // Writes bytes
        const response = await fetch(this.url);
        const bytes = await response.bytes();
        await file.write(bytes);

        // Prints result
        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
        good(`Successfully synced upstream ${glow(this.upstream)}, file size ${glow(size)} MiB.`);
    }
    async test(): Promise<void> {
        // Checks safe
        if(this.flags.has("safe")) {
            hint(`Upstream ${glow(this.upstream)} has flag ${glow("safe")}, skipping test.`);
            return;
        }

        // Checks url
        const response = await fetch(this.url, { method: "HEAD" });
        if(!response.ok) {
            bad(`Upstream ${glow(this.upstream)} leads to a corrupted URL.`);
            return;
        }
        
        // Prints result
        good(`Upstream ${glow(this.upstream)} is satisfied.`);
    }
}

// Exports
export default Direct;
