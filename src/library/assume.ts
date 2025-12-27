// Imports
import Packet from "./packet";
import { glow, hint } from "../../pretty";

// Defines class
export class Assume implements Packet {
    // Defines upstream fields
    readonly flags: Set<string>;
    readonly upstream: string;
    readonly values: string[];

    // Defines data fields
    readonly label: string;

    // Defines constructor
    constructor(upstream: string, values: string[], flags: Set<string>) {
        // Updates upstream fields
        this.flags = flags;
        this.upstream = upstream;
        this.values = values;
                
        // Updates data fields
        if(this.values.length < 2 || this.values[0] !== "assume")
            throw new Error(`Invalid upstream ${glow(this.upstream)}, expects ${glow("assume;$LABEL")}.`);
        [ this.label ] = this.values.slice(1);
    }

    // Defines api methods
    async sync(): Promise<void> {
        // Skips assumption
        hint(`Upstream ${glow(this.upstream)} is assumed to exist, skipping sync.`);
    }
    async test(): Promise<void> {
        // Skips assumption
        hint(`Upstream ${glow(this.upstream)} is assumed to exist, skipping test.`);
    }
}

// Exports
export default Assume;
