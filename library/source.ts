// Imports
import type Pack from "./pack";

// Defines source
export interface Source {
    // Defines source fields
    readonly origin:    string;
    readonly label:     string;
    
    // Defines source methods
    dep(pack: Pack):    Promise<Result<Dependencies>>;
    sync(pack: Pack):   Promise<Result<boolean>>;
    test(pack: Pack):   Promise<Result<boolean>>;
}

// Exports
export default Source;
