// Imports
import nodeAssert from "node:assert";
import nodeFs from "node:fs/promises";
import nodePath from "node:path";
import AdmZip from "adm-zip";
import errors from "./errors.json";

// Defines 'fabric.mod.json' interface
interface FabricModJSON {
    authors: string[];
    depends: { [ depenency: string ]: string; }
    description: string;
    id: string;
    name: string;
    version: string;
}

// 
class ModrinthRegistry {
    static readonly API = "https://api.modrinth.com/v2/"
    static readonly USER_AGENT = "DmmDGM/gsmc-pack/3.0.0 (dev) (dmmdgm@dmmdgm.dev)";

    static async fetchProjectDetails(id: string) {
        const response = await fetch(new URL(`/project/${id}`, ModrinthRegistry.API))
    }
}

// Represents a '.minecraft' instance
class MinecraftInstance {
    // Defines fields
    readonly dotMinecraftPath: string;

    // Defines constructor
    constructor(dotMinecraftPath: string) {
        // Checks validity of '.minecraft'
        const isInstanceDotMinecraft = dotMinecraftPath.endsWith(".minecraft");
        nodeAssert(isInstanceDotMinecraft, _error("INVALID_DOT_MINECRAFT_PATH", { "path": dotMinecraftPath }));
        
        // Initialize fields
        this.dotMinecraftPath = dotMinecraftPath;
    }

    // Reads '.minecraft/mods' directory
    async readModsDirectory(): Promise<MinecraftMod[]> {
        try {
            // Gets list of mods in mod directory
            const modFiles = await nodeFs.readdir(nodePath.join(this.dotMinecraftPath, "mods"));
            return modFiles.map((modFile) => new MinecraftMod(nodePath.join(this.dotMinecraftPath, "mods", modFile)));
        }
        catch {
            // Returns empty list if failed
            return [];
        }
    }
}

// Represents a Minecraft mod file
class MinecraftMod {
    // Defines fields
    readonly modFilePath: string;

    // Defines constructor
    constructor(modFilePath: string) {
        // Checks validity of mod file
        const isModDotJar = modFilePath.endsWith(".jar") || modFilePath.endsWith(".jar.disabled");
        nodeAssert(isModDotJar, _error("INVALID_MOD_FILE_PATH", { path: modFilePath }));
        
        // Initializes fields
        this.modFilePath = modFilePath;
    }

    // Checks if mod is disabled
    isModDisabled(): boolean {
        // Checks mod file extension
        return this.modFilePath.endsWith(".jar.disabled");
    }

    // Parses 'fabric.mod.json' in mod file
    parseAsFabricMod(): Promise<FabricModJSON> {
        // Checks existence of 'fabric.mod.json'
        const zip = new AdmZip(this.modFilePath);
        const metadataEntry = zip.getEntry("fabric.mod.json");
        nodeAssert(metadataEntry !== null, _error("MISSING_FABRIC_MOD_JSON", { path: this.modFilePath }));

        // Parses 'fabric.mod.json' as JSON
        return new Promise((resolve, reject) => {
            metadataEntry.getDataAsync((data, error) => {
                if(typeof error !== "undefined") reject(error);
                try {
                    resolve(JSON.parse(data.toString()));
                }
                catch {
                    reject(_error("INVALID_FABRIC_MOD_JSON", { path: this.modFilePath }));
                }
            })
        });
    }
}

// Formats assertion error
function _error(code: keyof typeof errors, tags: { [ tags in string ]: string } = {}): string {
    // Replaces tags in error message
    const message = errors[code] ?? `The error code provided does not exist, got '${code}'.`;
    return message.replaceAll(/\$(\w+)/g, (match, tag) => tag in tags ? tags[tag] : match);
}

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/.local/share/multimc/instances/Geesecraft S5 (1.20.1)/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
const mods = await instance.readModsDirectory();
console.log(await mods[0].parseAsFabricMod());
