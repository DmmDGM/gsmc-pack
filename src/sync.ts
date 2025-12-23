// Imports
import * as library from "./library";
import { glow, printFail, printPass, printYell } from "./library";

// Runs script
await library.run(async () => {
    // Parses origins
    const origins = await library.source();
    
    // Creates locals
    let counter = 0;

    // Executes tasks
    const tasks = origins.map(async (origin) => await library.run(async () => {
        // Parses methods
        const [ method, ...parameters ] = origin.split(";");
        switch(method) {
            case "modrinth": {
                // Parses parameters
                if(parameters.length < 3) throw new library.MalformedOriginError(origin);
                const [ label, platform, version ] = parameters;

                // Checks entries
                const identity = `${label}.${platform}.${version}`;
                const entries = await library.modrinthSearch(label, [ platform ], [ version ]);
                if(entries.length === 0) {
                    printFail(`[Modrinth] Cannot find origin ${glow(identity)}.`);
                    break;
                }

                // Downloads file
                const entry = entries[0];
                const status = await library.download(entry.as, entry.url);
                if(!status) {
                    printFail(`[Modrinth] Failed to sync origin ${glow(identity)}.`);
                    break;
                }

                // Checks hash
                const valid = await library.validate(entry.as, entry.hash);
                if(!valid) {
                    await library.kill(entry.as);
                    printFail(`[Modrinth] Hash does not match for origin ${glow(identity)}.`);
                    break;
                }

                // Prints pass
                const size = `${Math.round(entry.size / 1024 / 1024 * 100) / 100} MiB`;
                printPass(`[Modrinth] Successfully synced origin ${glow(identity)} (${glow(size)}).`);
                counter++;
                break;
            }
            case "direct": {
                // Parses parameters
                if(parameters.length < 3) throw new library.MalformedOriginError(origin);
                const [ label, url, as ] = parameters;
                
                // Downloads file
                const identity = `${label}.${url}`;
                const status = await library.download(as, url);
                if(!status) {
                    printFail(`[Direct] Failed to sync origin ${glow(identity)}.`);
                    break;
                }

                // Prints pass
                printPass(`[Direct] Successfully synced origin ${glow(identity)}.`);
                counter++;
                break;
            }
            default: {
                // Throws error
                throw new library.MalformedOriginError(origin);
            }
        }
    }));
    await Promise.all(tasks);
    
    // Prints message
    printYell(`${counter} / ${origins.length} origin(s) synced.`);
});
