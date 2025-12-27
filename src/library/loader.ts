// Imports
import Assume from "./assume";
import { attempt, packf } from "./common";
import Direct from "./direct";
import Modrinth from "./modrinth";
import Packet from "./packet";
import { err, glow } from "../../pretty";

// Defines class
export class Loader {
    // Defines upstream fields
    readonly upstreams: string[];
    
    // Defines packets fields
    readonly packets: Packet[];
    readonly labels: Set<string>;

    // Defines constructor
    constructor(upstreams: string[]) {
        // Updates upstream fields
        this.upstreams = upstreams;

        // Updates packets fields
        this.packets = upstreams.map((upstream) => {
            // Parses upstream
            const chunks = upstream.split(";;");
            const values = (chunks[0] ?? "").split(";");
            const flags = new Set((chunks[1] ?? "").split(";"));

            // Parses packet
            const method = values[0] ?? "";
            switch(method) {
                case "assume": {
                    return new Assume(upstream, values, flags);
                }
                case "direct": {
                    return new Direct(upstream, values, flags);
                }
                case "modrinth": {
                    return new Modrinth(upstream, values, flags);
                }
                default: {
                    throw new Error(`Invalid upstream ${glow(upstream)}, expects ${glow("$METHOD")}`);
                }
            }
        });
        this.labels = new Set(this.packets.map((packet) => packet.label));
    }
}

// Exports
export default Loader;
