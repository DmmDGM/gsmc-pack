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

                // Prints pass
                const identity = `${label}.${platform}.${version}`;
                const entriesExact = await library.modrinthSearch(label, [ platform ], [ version ]);
                if(entriesExact.length > 0) {
                    library.printPass(`[Modrinth] Origin ${chalk.magenta(identity)} is supported.`);
                    counter++;
                    break;
                }
                
                // Prints fail
                const entriesPlatform = await library.modrinthSearch(label, [ platform ], []);
                const entriesVersion = await library.modrinthSearch(label, [], [ version ]);
                library.printFail(`[Modrinth] Origin ${chalk.magenta(identity)} is not supported.`);
                if(entriesPlatform.length > 0)
                    library.printNote(`\tLast commit for platform ${chalk.magenta(platform)} is for version(s) ${chalk.magenta(entriesPlatform[0].versions.join(", "))}.`);
                if(entriesVersion.length > 0)
                    library.printNote(`\tLast commit for version ${chalk.magenta(version)} is for platform(s) ${chalk.magenta(entriesVersion[0].platforms.join(", "))}.`);
                break;
            }
            case "direct": {
                // Parses parameters
                if(parameters.length < 3) throw new library.MalformedOriginError(origin);
                const [ label, url, as ] = parameters;
                
                // Prints pass
                const identity = `${label}.${url}`;
                const response = await fetch(url);
                if(response.ok) {
                    library.printPass(`[Direct] Origin ${chalk.magenta(identity)} is reachable.`);
                    counter++;
                    break;
                }

                // Prints pass
                library.printFail(`[Direct] Origin ${chalk.magenta(identity)} is not reachable.`);
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
    library.printYell(`${counter} / ${origins.length} origin(s) passed.`);
});
