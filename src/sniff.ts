// Imports
import * as library from "./library";
import { glow, printFail, printNote, printPass, printYell } from "./library";

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

                // Prints pass
                const identity = `${label}.${platform}.${version}`;
                const entriesExact = await library.modrinthSearch(label, [ platform ], [ version ]);
                if(entriesExact.length > 0) {
                    printPass(`[Modrinth] Origin ${glow(identity)} is supported.`);
                    counter++;
                    break;
                }
                
                // Prints fail
                const entriesPlatforms = await library.modrinthSearch(label, [ platform ], []);
                const entriesVersions = await library.modrinthSearch(label, [], [ version ]);
                printFail(`[Modrinth] Origin ${glow(identity)} is not supported.`);
                if(entriesPlatforms.length > 0)
                    printNote(`Last commit for platform ${glow(platform)} is for version(s) ${entriesPlatforms[0].versions.map(glow).join(", ")}.`, 1);
                if(entriesVersions.length > 0)
                    printNote(`Last commit for version ${glow(version)} is for platform(s) ${entriesVersions[0].platforms.map(glow).join(", ")}.`, 1);
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
                    printPass(`[Direct] Origin ${glow(identity)} is reachable.`);
                    counter++;
                    break;
                }

                // Prints fail
                printFail(`[Direct] Origin ${glow(identity)} is not reachable.`);
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
    printYell(`${counter} / ${origins.length} origin(s) passed.`);
});
