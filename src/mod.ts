// Imports
import nodeAssert from "node:assert";
import AdmZip from "adm-zip";
import { _error } from "./core";
import { GSMCPackJSON } from "./instance";

/** A list of supported Minecraft mod flavors in gsmc-pack. */
export enum MinecraftModFlavor {
    FABRIC = "FABRIC",
    FORGE = "FORGE",
    NEO_FORGE = "NEO_FORGE"
}

/** A representation of a Minecraft mod. */
export abstract class MinecraftMod {
    /** The path to this mod. */
    readonly path: string;

    /**
     * Creates a new Minecraft mod representation.
     * @param path The path to this mod.
     */
    constructor(path: string) {
        // Ensures '.jar' file extension
        const isModDotJar = path.endsWith(".jar") || path.endsWith(".jar.disabled");
        nodeAssert(isModDotJar, _error("MOD:NOT_A_DOT_JAR", { path: path }));
        
        // Initializes class
        this.path = path;
    }

    /**
     * Compiles the sha1 file hash of this mod.
     * @returns This mod's sha1 file hash.
     */
    async compileFileHash(): Promise<string> {
        // Hashes file content
        return Bun.CryptoHasher.hash("sha1", await Bun.file(this.path).bytes()).toHex();
    }
}

/** A generic representation of a Minecraft mod. */
export class GenericMinecraftMod extends MinecraftMod {
    /**
     * Parses this mod as a Fabric mod.
     * @returns A Fabric representation of this mod.
     */
    async parseAsFabricMod(): Promise<FabricMinecraftMod> {
        // Ensures existence of 'fabric.mod.json'
        const zip = new AdmZip(this.path);
        const entry = zip.getEntry("fabric.mod.json");
        nodeAssert(entry !== null, _error("FABRIC_MOD:MISSING_FABRIC_MOD_JSON", { path: this.path }));

        // Parses metadata from 'fabric.mod.json'
        const metadata = await new Promise<GSMCPackJSON["addons"][string]["metadata"]>((resolve, reject) => {
            entry.getDataAsync((data, error) => {
                if(typeof error !== "undefined") reject(error);
                try {
                    const json = JSON.parse(data.toString());
                    resolve({
                        name: json["name"] ?? this.path,
                        version: json["version"] ?? "0.0.0",
                    });
                }
                catch {
                    reject(_error("FABRIC_MOD:BROKEN_FABRIC_MOD_JSON", { path: this.path }));
                }
            })
        });

        // Upgrades representation
        return new FabricMinecraftMod(this.path, metadata);
    }

    /**
     * Sniffs the flavor of this mod.
     * @returns This mod's flavor.
     */
    async sniffModFlavor(): Promise<MinecraftModFlavor> {
        // Checks if 'this.parseAsFabricMod' succeeds
        try {
            await this.parseAsFabricMod();
            return MinecraftModFlavor.FABRIC;
        }
        catch {}

        // Throws error
        nodeAssert(false, _error("MOD:INVALID_OR_UNSUPPORTED_FLAVOR", { path: this.path }));
    }
}

/** A Fabric representation of a Minecraft mod. */
export class FabricMinecraftMod extends MinecraftMod {
    /** The metadata of this mod. */
    readonly metadata: GSMCPackJSON["addons"][string]["metadata"];
    
    /** Creates a new Fabric Minecraft mod representation. */
    constructor(path: string, metadata: GSMCPackJSON["addons"][string]["metadata"]) {
        // Extends parent
        super(path);

        // Initializes class
        this.metadata = metadata;
    }
}

/** A Forge representation of a Minecraft mod. */
export class ForgeMinecraftMod extends MinecraftMod {
    
}

/** A NeoForge representation of a Minecraft mod. */
export class NeoForgeMinecraftMod extends MinecraftMod {

}
