// Import
import nodePath from "node:path";
import pack from "./pack";
import { err, glow, say, bad } from "./pretty";
import { args, flags } from "./runtime";
import { fmap, fsettle } from "./toolbox";
import { origins, sources } from "./pack";

// Runs script
const action = args[0];
switch(action) {
    case "dep": {
        const results = await fsettle(sources.map((source) => source.dep(pack)));
        say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins scanned.`);
        break;
    }
    case "sync": {
        const results = await fsettle(sources.map((source) => source.sync(pack)));
        say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins synced.`);
        break;
    }
    case "test": {
        const results = await fsettle(sources.map((source) => source.test(pack)));
        say(`Total of ${results.filter((result) => result).length} / ${origins.length} origins passed.`);
        break;
    }
    default: {
        bad(`Invalid command, unknown action ${glow(action)}.`);
        break;
    }
}
