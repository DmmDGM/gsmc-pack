// Imports
import type { GSMCPackJSON } from "../core/common";
import nodeFs from "node:fs/promises";
import nodePath from "node:path";
import { AbstractMinecraftMod, FlavoredMinecraftMod } from "./mod";

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
    async initPackFile(version: string): Promise<void> {
        // Creates blank 'gsmc-pack.json' file
        const pack: GSMCPackJSON = {
            addons: {},
            description: "",
            environment: {
                mod: null,
                plugin: null,
                shader: null,
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
        return Bun.file(nodePath.join(this.path, "gsmc-pack.json")).json();
    }

    /**
     * Resynchronizes the 'addons' field in this instance's 'gsmc-pack.json' file.
     * @returns An array of successful resyncs and an array of failed resyncs.
     */
    async resyncAddons(): Promise<[ FlavoredMinecraftMod[], AbstractMinecraftMod[] ]> {
        // Resets 'addons' field in 'gsmc-pack.json' file
        const pack = await this.readPackFile();
        pack.addons = {};

        // Parses mods
        const mods = await this.readModsDirectory();
        const successes: FlavoredMinecraftMod[] = [];
        const failures: AbstractMinecraftMod[] = [];
        for(const mod of mods) {
            try {
                const flavored = await mod.resolveAsFlavoredMod();
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
        await Bun.file(nodePath.join(this.path, "gsmc-pack.json")).write(JSON.stringify(pack, null, 4));
    }
}
