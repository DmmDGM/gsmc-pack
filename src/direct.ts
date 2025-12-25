// Imports
import nodePath from "node:path";
import { fsync, packd } from "./common";
import Packet from "./packet";
import { glow, good, hint } from "./pretty";

// Defines class
export class Direct implements Packet {
    // Defines raw fields
    readonly flags: Set<string>;
    readonly origin: string[];

    // Defines origin fields
    readonly file: string;
    readonly label: string;
    readonly url: string;

    // Defines constructor
    constructor(origin: string[], flags: Set<string>) {
        // Updates raw fields
        this.flags = flags;
        this.origin = origin;
                
        // Parses origin
        if(this.origin.length < 4 || this.origin[0] !== "direct")
            throw new Error(`Invalid origin ${glow(this.origin)}, expects ${glow("direct;$LABEL;$URL;$FILE")}.`);
        [ this.label, this.url, this.file ] = this.origin.slice(1);
    }

    // Defines api methods
    async sync(): Promise<void> {
        // Checks flag
        if(this.flags.has("nosync")) {
            hint(`Origin ${glow(this.origin)} has flag ${glow("nosync")}, skipping sync.`);
            return;
        }

        // Loads file
        const file = Bun.file(nodePath.resolve(packd, this.file));

        // Checks fsync
        if(await file.exists() && !fsync) {
            hint(`Origin ${glow(this.origin)} already exists, skipping sync.`);
            return;
        }
        
        // Writes bytes
        const response = await fetch(this.url);
        const bytes = await response.bytes();
        await file.write(bytes);

        // Prints result
        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
        good(`Successfully synced origin ${glow(this.origin)}, file size ${glow(size)} MiB.`);
    }
    async test(): Promise<void> {
        // Checks flag
        if(this.flags.has("safe")) {
            hint(`Origin ${glow(this.origin)} has flag ${glow("safe")}, skipping test.`);
            return;
        }

        // Checks url
        const response = await fetch(this.url, {
            method: "HEAD"
        });
        if(!response.ok) throw new Error(`Origin ${glow(origin)} leads to a corrupted URL.`);
        
        // Prints status
        good(`Origin ${glow(this.origin)} is satisfied.`);
    }
}

// Exports
export default Direct;
