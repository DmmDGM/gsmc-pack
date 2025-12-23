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
                const entriesPlatforms = await library.modrinthSearch(label, [ platform ], []);
                const entriesVersions = await library.modrinthSearch(label, [], [ version ]);
                library.printFail(`[Modrinth] Origin ${chalk.magenta(identity)} is not supported.`);
                if(entriesPlatforms.length > 0)
                    library.printNote(`Last commit for platform ${chalk.magenta(platform)} is for version(s) ${entriesPlatforms[0].versions.map((version) => chalk.magenta(version)).join(", ")}.`, 1);
                if(entriesVersions.length > 0)
                    library.printNote(`Last commit for version ${chalk.magenta(version)} is for platform(s) ${entriesVersions[0].platforms.map((platform) => chalk.magenta(platform)).join(", ")}.`, 1);
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
