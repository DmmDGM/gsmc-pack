// Imports
import chalk from "chalk";
import * as library from "./library";

// Verifies origins
await library.run(async () => {
    // Parses origins
    const origins = await library.source();

    // Defines locals
    const avoids = new Map<string, Set<string>>();
    const needs = new Map<string, Set<string>>();
    const wants = new Map<string, Set<string>>();
    const list = new Set<string>();

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

                // Appends dependencies
                const entry = entries[0];
                for(let i = 0; i < entry.avoids.length; i++) {
                    // Fetches dependency
                    const dependency = await library.modrinthLookup(entry.avoids[i]);
                    if(dependency === null) continue;

                    // Appends dependency
                    const set = avoids.get(dependency) ?? new Set();
                    avoids.set(dependency, set.add(label));
                }
                for(let i = 0; i < entry.needs.length; i++) {
                    // Fetches dependency
                    const dependency = await library.modrinthLookup(entry.needs[i]);
                    if(dependency === null) continue;

                    // Appends dependency
                    const set = needs.get(dependency) ?? new Set();
                    needs.set(dependency, set.add(label));
                }
                for(let i = 0; i < entry.wants.length; i++) {
                    // Fetches dependency
                    const dependency = await library.modrinthLookup(entry.wants[i]);
                    if(dependency === null) continue;

                    // Appends dependency
                    const set = wants.get(dependency) ?? new Set();
                    wants.set(dependency, set.add(label));
                }
                list.add(label);
                break;
            }
            case "direct": {
                // Parses parameters
                if(parameters.length < 3) throw new library.MalformedOriginError(origin);
                const [ label, url, as ] = parameters;

                // Prints pass
                const identity = `${label}.${url}`;
                const response = await fetch(url);
                if(!response.ok) {
                    library.printFail(`[Direct] Origin ${chalk.magenta(identity)} is not reachable.`);
                    break;
                }

                // Appends depencies
                list.add(label);
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
    list.forEach((label) => {
        library.printYell(`Dependency tree for origin ${chalk.magenta(label)}.`);
        (avoids.get(label) ?? new Set()).forEach((dependency) => {
            library.printFail(`Avoided by dependency ${chalk.magenta(dependency)}.`, 1);
        });
        (needs.get(label) ?? new Set()).forEach((dependency) => {
            library.printPass(`Needs dependency ${chalk.magenta(dependency)}.`, 1);
        });
        (wants.get(label) ?? new Set()).forEach((dependency) => {
            library.printNote(`Wants dependency ${chalk.magenta(dependency)}.`, 1);
        });
    });
});
