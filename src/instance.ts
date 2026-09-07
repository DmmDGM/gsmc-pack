// Imports
import nodeFs from "node:fs/promises";
import nodePath from "node:path";
import { AbstractMinecraftMod, FlavoredMinecraftMod } from "./mod";
import { MinecraftAddonType, MinecraftModFlavor } from "./common";

/** A representation of the 'gsmc-pack.json' interface. */
export interface GSMCPackJSON {
    addons: {
        [ Hash in string ]: {
            flavor: MinecraftModFlavor;
            id: string;
            name: string;
            type: MinecraftAddonType;
            upstream: string;
            version: string;
        }
    };
    description: string;
    environment: {
        mod_loader: MinecraftModFlavor | null;
        plugin_loader: null;
        shader_loader: null;
        version: string;
    };
    name: string;
    schema: number;
}

/** A representation of a Minecraft instance. */
export class MinecraftInstance {
    /** The path to this instance. */
    readonly path: string;

    /**
     * Creates a new Minecraft instance representation.
     * @param path The path to this instance.
     */
    constructor(path: string) {    
        // Initializes class
        this.path = path;
    }

    /**
     * Creates a new 'gsmc-pack.json' file in this instance.
     * @param version The Minecraft version of this instance.
     */
    async initPackFile(version: string, mod_loader: MinecraftModFlavor | null): Promise<void> {
        // Creates blank 'gsmc-pack.json' file
        const pack: GSMCPackJSON = {
            addons: {},
            description: "",
            environment: {
                mod_loader,
                plugin_loader: null,
                shader_loader: null,
                version
            },
            name: "",
            schema: 1
        };
        await this.writePackFile(pack);
    }

    /**
     * Reads the 'mods' directory of this instance.
     * @returns An array of this instance's mods.
     */
    async readModsDirectory(): Promise<AbstractMinecraftMod[]> {
        try {
            // Reads 'mods' directory if exists
            const mods = await nodeFs.readdir(nodePath.join(this.path, "mods"));
            return mods.map((mod) => new AbstractMinecraftMod(nodePath.join(this.path, "mods", mod)));
        }
        catch {
            // Returns empty array as fallback
            return [];
        }
    }

    /**
     * Reads the instance data from the 'gsmc-pack.json' file in this instance.
     * @returns This instance's data from its 'gsmc-pack.json' file. 
     */
    async readPackFile(): Promise<GSMCPackJSON> {
        // Reads 'gsmc-pack.json' file
        return Bun.file("gsmc-pack.json").json();
    }

    /**
     * Refreshes forcefully the 'addons' field in this instance's 'gsmc-pack.json' file.
     * @returns An array of successful refreshes and an array of failed refreshes.
     */
    async refreshAddons(): Promise<[ FlavoredMinecraftMod[], AbstractMinecraftMod[] ]> {
        // Resets 'addons' field in 'gsmc-pack.json' file
        const pack = await this.readPackFile();
        pack.addons = {};

        // Parses mods
        const mods = await this.readModsDirectory();
        const successes: FlavoredMinecraftMod[] = [];
        const failures: AbstractMinecraftMod[] = [];
        for(const mod of mods) {
            try {
                const flavored = await mod.parseAsFlavoredMod();
                pack.addons[flavored.hash] = flavored.metadata;
                successes.push(flavored);
            }
            catch {
                failures.push(mod);
                continue;
            }
        }
        
        // Writes 'addons' field to 'gsmc-pack.json' file
        await this.writePackFile(pack);

        // Returns results
        return [ successes, failures ];
    }

    /**
     * Writes the instance data to the 'gsmc-pack.json' file in this instance.
     * @param pack The instance data.
     */
    async writePackFile(pack: GSMCPackJSON): Promise<void> {
        // Writes 'gsmc-pack.json' file
        await Bun.file("gsmc-pack.json").write(JSON.stringify(pack, null, 4));
    }
}
