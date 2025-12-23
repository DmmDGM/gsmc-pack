// Imports
import chalk from "chalk";
import * as library from "./library";

// Verifies origins
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
                    library.printFail(`[Modrinth] Cannot find origin ${chalk.magenta(identity)}.`);
                    break;
                }

                // Downloads file
                const entry = entries[0];
                const status = await library.download(entry.as, entry.url);
                if(!status) {
                    library.printFail(`[Modrinth] Failed to sync origin ${chalk.magenta(identity)}.`);
                    break;
                }

                // Checks hash
                const valid = await library.validate(entry.as, entry.hash);
                if(!valid) {
                    await library.kill(entry.as);
                    library.printFail(`[Modrinth] Hash does not match for origin ${chalk.magenta(identity)}.`);
                    break;
                }

                // Prints pass
                const size = `${Math.round(entry.size / 1024 / 1024 * 100) / 100} MiB`;
                library.printPass(`[Modrinth] Successfully synced origin ${chalk.magenta(identity)} (${chalk.magenta(size)}).`);
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
                    library.printFail(`[Direct] Failed to sync origin ${chalk.magenta(identity)}.`);
                    break;
                }

                // Prints pass
                library.printPass(`[Direct] Successfully synced origin ${chalk.magenta(identity)}.`);
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
    library.printYell(`${counter} / ${origins.length} origin(s) synced.`);
});
