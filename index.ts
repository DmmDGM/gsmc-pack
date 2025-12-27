// Import
import nodePath from "node:path";
import { err, glow, say, bad } from "./pretty";
import { args, flags } from "./runtime";
import { fmap } from "./toolbox";
import { labels, origins, sources } from "./pack";

// Runs script
if(import.meta.main) {
    const action = args[0];

    switch(action) {
        case "sync": {
            const results = await settle(sources.map((source) => source.sync()));
            say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins synced.`);
            break;
        }
        case "test": {
            const results = await settle(sources.map((source) => source.test()));
            say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins passed.`);
            break;
        }
        default: {
            bad(`Invalid command, unknown action ${glow(action)}.`);
            break;
        }
    }
}
