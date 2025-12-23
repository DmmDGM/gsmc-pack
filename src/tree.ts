// Imports
import * as library from "./library";
import { glow, printAlert, printBad, printFail, printGood, printNote, printYell } from "./library";

// Runs script
await library.run(async () => {
    // Parses origins
    const origins = await library.source();

    // Defines locals
    const modrinthMapper = new Map<string, string>();
    const avoided = new Map<string, Set<string>>();
    const needed = new Map<string, Set<string>>();
    const wanted = new Map<string, Set<string>>();
    const labels = new Set<string>();

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

                // Updates dependencies
                const entry = entries[0];
                for(let i = 0; i < entry.avoids.length; i++) {
                    const dependency = modrinthMapper.get(entry.avoids[i]) ?? await library.modrinthLookup(entry.avoids[i]);
                    if(dependency === null) continue;
                    modrinthMapper.set(entry.avoids[i], dependency);
                    avoided.set(dependency, (avoided.get(dependency) ?? new Set()).add(label));
                }
                for(let i = 0; i < entry.needs.length; i++) {
                    const dependency = modrinthMapper.get(entry.needs[i]) ?? await library.modrinthLookup(entry.needs[i]);
                    if(dependency === null) continue;
                    modrinthMapper.set(entry.needs[i], dependency);
                    needed.set(dependency, (needed.get(dependency) ?? new Set()).add(label));
                }
                for(let i = 0; i < entry.wants.length; i++) {
                    const dependency = modrinthMapper.get(entry.wants[i]) ?? await library.modrinthLookup(entry.wants[i]);
                    if(dependency === null) continue;
                    modrinthMapper.set(entry.wants[i], dependency);
                    wanted.set(dependency, (wanted.get(dependency) ?? new Set()).add(label));
                }
                labels.add(label);
                break;
            }
            case "direct": {
                // Parses parameters
                if(parameters.length < 3) throw new library.MalformedOriginError(origin);
                const [ label, url, as ] = parameters;

                // Checks response
                const identity = `${label}.${url}`;
                const response = await fetch(url);
                if(!response.ok) {
                    printFail(`[Direct] Origin ${glow(identity)} is not reachable.`);
                    break;
                }

                // Updates dependencies
                labels.add(label);
                break;
            }
            default: {
                // Throws error
                throw new library.MalformedOriginError(origin);
            }
        }
    }));
    await Promise.all(tasks);
    
    // Prints supply messages
    labels.forEach((child) => {
        let total = 0;
        total += (needed.get(child) ?? new Set()).size;
        total += (wanted.get(child) ?? new Set()).size;
        if(total === 0) printAlert(`[Supply] Dependency ${glow(child)} is not marked as required or optional by any origins.`);
        else {
            (needed.get(child) ?? new Set()).forEach((parent) => printGood(`[Supply] Dependency ${glow(child)} is marked as required by origin ${glow(parent)}.`));
            (avoided.get(child) ?? new Set()).forEach((parent) => printBad(`[Supply] Dependency ${glow(child)} is marked as conflicting by by origin ${glow(parent)}.`));
            (wanted.get(child) ?? new Set()).forEach((parent) => printNote(`[Supply] Dependency ${glow(child)} is marked as optional by origin ${glow(parent)}.`));
        }
    });

    // Print demand messages
    needed.forEach((parents, child) => {
        if(!labels.has(child))
            parents.forEach((parent) => printBad(`[Demand] Dependency ${glow(child)} is marked as required by origin ${glow(parent)} but does not exist.`));
    });
    avoided.forEach((parents, child) => {
        if(labels.has(child))
            parents.forEach((parent) => printBad(`[Demand] Dependency ${glow(child)} exists but is marked as conflicting by origin ${glow(parent)}.`));
    });
    wanted.forEach((parents, child) => {
        if(!labels.has(child))
            parents.forEach((parent) => printNote(`[Demand] Dependency ${glow(child)} is marked as optional by origin ${glow(parent)} but does not exist.`));
    });

    // Print message
    printYell(`${labels.size} / ${origins.length} origin(s) scanned.`);
});
