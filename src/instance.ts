// Imports
import nodeFs from "node:fs/promises";
import nodePath from "node:path";
import { GenericMinecraftMod, MinecraftModFlavor } from "./mod";
import { ModrinthRegistry } from "./modrinth";

/** A list of supported Minecraft addon types in gsmc-pack. */
export enum MinecraftAddonType {
    DATA = "DATA",
    MOD = "MOD",
    PLUGIN = "PLUGIN",
    RESOURCE = "RESOURCE",
    SHADER = "SHADER"
}

/** A representation of the 'gsmc-pack.json' interface. */
export interface GSMCPackJSON {
    addons: {
        [ Hash in string ]: {
            flavor: MinecraftModFlavor;
            metadata: {
                name: string;
                version: string;
            };
            type: MinecraftAddonType;
            upstream: string;
        }
    };
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
     * Reads the 'mods' directory of this instance.
     * @returns An array of this instance's mods.
     */
    async readModsDirectory(): Promise<GenericMinecraftMod[]> {
        try {
            // Reads 'mods' directory if exists
            const mods = await nodeFs.readdir(nodePath.join(this.path, "mods"));
            return mods.map((mod) => new GenericMinecraftMod(nodePath.join(this.path, "mods", mod)));
        }
        catch {
            // Returns empty array as fallback
            return [];
        }
    }

    async readPackFile(): Promise<void> {

    }

    async writePackFile(): Promise<void> {

    }

    async initPackFile(): Promise<void> {
        const pack: GSMCPackJSON = {
            addons: {},
            schema: 1
        };

        const mods = await this.readModsDirectory();
        for(const mod of mods) {
            const hash = await mod.compileFileHash();
            switch(await mod.sniffModFlavor()) {
                case MinecraftModFlavor.FABRIC: {
                    try {
                        const fabric = await mod.parseAsFabricMod();
                        const entry: GSMCPackJSON["addons"][string] = {
                            flavor: MinecraftModFlavor.FABRIC,
                            metadata: fabric.metadata,
                            type: MinecraftAddonType.MOD,
                            upstream: `MODRINTH:${await ModrinthRegistry.fetchProjectIDFromFileHash(hash)}`
                        };
                        pack.addons[hash] = entry;
                    }
                    catch { console.log(mod.path, "not found"); continue; }
                    break;
                }
            }
        }
        await Bun.file("gsmc-pack.json").write(JSON.stringify(pack));
    }
}
