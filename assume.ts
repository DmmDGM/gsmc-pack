// Imports
import { glow, hint } from "./pretty";

// Defines assume source
export class Assume implements Source {
    // Defines source fields
    readonly origin: string;
    readonly label: string;

    // Defines constructor
    constructor(origin: string, label: string) {
        // Updates source fields
        this.origin = origin;
        this.label = label;
    }

    // Defines source methods
    async dep(pack: Pack): Promise<boolean> {
        // Skips dep
        hint(`Origin ${glow(this.origin)} is an assumed source, skipping dep.`);
        return true;
    }
    async sync(pack: Pack): Promise<boolean> {
        // Skips sync
        hint(`Origin ${glow(this.origin)} is an assumed source, skipping sync.`);
        return true;
    }
    async test(pack: Pack): Promise<boolean> {
        // Skips test
        hint(`Origin ${glow(this.origin)} is an assumed source, skipping test.`);
        return true;
    }
}

// Exports
export default Assume;
