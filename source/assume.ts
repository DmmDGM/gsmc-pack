// Imports
import Code from "../library/code";
import Source from "../library/source";

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
    async dep(pack: Pack): Promise<Result<Dependencies>> {
        // Returns result
        return {
            cause: "Origin is assumed.",
            code: Code.DEP_ORIGIN_SKIPPED,
            okay: false
        }
    }
    async sync(pack: Pack): Promise<Result<boolean>> {
        // Returns result
        return {
            cause: "Origin is assumed.",
            code: Code.SYNC_ORIGIN_SKIPPED,
            okay: false
        };
    }
    async test(pack: Pack): Promise<Result<boolean>> {
        // Returns result
        return {
            cause: "Origin is assumed.",
            code: Code.TEST_ORIGIN_SKIPPED,
            okay: false
        };
    }
}

// Exports
export default Assume;
