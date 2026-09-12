// Imports
import { readdir as readDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "./addon";
import { MinecraftMod } from "./mod";
import { MinecraftAddonFlavor } from "../core/flavor";
import { GSMCPack } from "../core/gsmcpack";
import { MinecraftAddonType } from "../core/type";

/** Represents a Minecraft instance. */
export class MinecraftInstance {
    /** The path to this instance. */
    readonly path: string;

    /**
     * Creates a new Minecraft instance instance.
     * @param path The path to this instance.
     */
    constructor(path: string) {    
        // Initializes instance
        this.path = path;
    }

    /**
     * Creates a new 'gsmc-pack.json' file in this instance.
     * @returns Whether the write is successful.
     */
    async initGSMCPackFile(): Promise<boolean> {
        // Creates blank 'gsmc-pack.json' file
        const pack: GSMCPack = {
            addons: {},
            authors: [],
            description: "A list of my Minecraft addons for my world!",
            environment: {
                [ MinecraftAddonType.DATA_PACK ]: MinecraftAddonFlavor.VANILLA,
                [ MinecraftAddonType.MOD ]: MinecraftAddonFlavor.VANILLA,
                [ MinecraftAddonType.PLUGIN ]: MinecraftAddonFlavor.VANILLA,
                [ MinecraftAddonType.RESOURCE_PACK ]: MinecraftAddonFlavor.VANILLA,
                [ MinecraftAddonType.SHADER_PACK ]: MinecraftAddonFlavor.VANILLA,
                [ MinecraftAddonType.TEXTURE_PACK ]: MinecraftAddonFlavor.VANILLA,
            },
            minecraft: "26.2",
            name: "My GSMC Pack",
            schema: 1,
            server: false,
            version: "1.0.0"
        };

        // Writes 'gsmc-pack.json' file
        return await this.writeGSMCPackFile(pack);
    }

    /**
     * Lists the addons in this instance according to its 'gsmc-pack.json' file.
     * @returns An array of the addons in this instance.
     */
    async listGSMCPackAddons(): Promise<MinecraftAddon[]> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readGSMCPackFile();

        // Lists addons
        const addons: MinecraftAddon[] = [];
        for(const hash in pack.addons) {
            const metadata = pack.addons[hash];
            switch(metadata.type) {
                case MinecraftAddonType.MOD: {
                    addons.push(new MinecraftMod(this, resolvePath(this.path, metadata.path), metadata));
                    break;
                }
            }
        }

        // Returns addons
        return addons;
    }

    /**
     * Reads data from the 'gsmc-pack.json' file in this instance.
     * @returns This instance's data from its 'gsmc-pack.json' file. 
     */
    async readGSMCPackFile(): Promise<GSMCPack> {
        // Reads 'gsmc-pack.json' file
        return Bun.file(resolvePath(this.path, "gsmc-pack.json")).json();
    }

    /**
     * Rebuilds the 'addons' field of the 'gsmc-pack.json' file in this instance.
     * @returns An array of successful rebuilds and an array of failed rebuilds.
     */
    async rebuildGSMCPackAddons(): Promise<[ MinecraftAddon[], MinecraftAddon[] ]> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readGSMCPackFile();
        const successes: MinecraftAddon[] = [];
        const failures: MinecraftAddon[] = [];
        pack.addons = {};

        // Rebuilds mods
        try {
            const files = await readDirectory(resolvePath(this.path, "mods"));
            const mods = files.map((file) => new MinecraftMod(this, resolvePath(this.path, "mods", file), null));
            for(const mod of mods) {
                try {
                    const rebuilt = await mod.rebuildMetadataFromSourceFile();
                    pack.addons[await rebuilt.compileSha1FileHash()] = rebuilt.metadata!;
                    successes.push(rebuilt);
                }
                catch {
                    failures.push(mod);
                    continue;
                }
            }
        }
        catch {}
        
        // Writes 'gsmc-pack.json' file
        await this.writeGSMCPackFile(pack);

        // Returns results
        return [ successes, failures ];
    }

    /**
     * Writes data to the 'gsmc-pack.json' file in this instance.
     * @param pack The data for the 'gsmc-pack.json' file.
     * @returns Whether the write is successful.
     */
    async writeGSMCPackFile(pack: GSMCPack): Promise<boolean> {
        // Writes 'gsmc-pack.json' file
        try {
            await Bun.file(resolvePath(this.path, "gsmc-pack.json")).write(JSON.stringify(pack, null, 4));
            return true;
        }
        catch {
            return false;
        }
    }
}
