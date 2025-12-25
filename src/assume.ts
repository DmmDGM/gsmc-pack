// Imports
import Packet from "./packet";
import { glow, hint } from "./pretty";

// Defines class
export class Assume implements Packet {
    // Defines raw fields
    readonly flags: Set<string>;
    readonly origin: string[];

    // Defines origin fields
    readonly label: string;

    // Defines constructor
    constructor(origin: string[], flags: Set<string>) {
        // Updates raw fields
        this.flags = flags;
        this.origin = origin;
                
        // Parses origin
        if(this.origin.length < 2 || this.origin[0] !== "assume")
            throw new Error(`Invalid origin ${glow(this.origin)}, expects ${glow("assume;$LABEL")}.`);
        [ this.label ] = this.origin.slice(1);
    }

    // Defines api methods
    async sync(): Promise<void> {
        // Skips assumption
        hint(`Origin ${glow(this.origin)} is assumed to exist, skipping sync.`);
    }
    async test(): Promise<void> {
        // Skips assumption
        hint(`Origin ${glow(this.origin)} is assumed to exist, skipping test.`);
    }
}

// Exports
export default Assume;
