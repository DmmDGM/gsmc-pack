// Imports
import type Flags from "./flags";
import type Source from "./source";

// Defines pack
export interface Pack {
    readonly flags:     Flags;
    readonly args:      string[];
    readonly origins:   string[];
    readonly sources:   Source[];
    readonly labels:    Set<string>;
}

// Exports
export default Pack;
