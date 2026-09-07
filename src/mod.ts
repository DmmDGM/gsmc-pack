// Imports
import nodeAssert from "node:assert";
import nodeCrypto from "node:crypto";
import nodeFs from "node:fs/promises";
import AdmZip from "adm-zip";
import { _error } from "./core";

/** A list of supported Minecraft mod flavors in gsmc-pack. */
export enum MinecraftModFlavor {
    FABRIC,
    FORGE,
    NEO_FORGE
}

/** A representation of a Minecraft mod. */
export abstract class MinecraftMod {
    /** The path to this mod. */
    readonly modPath: string;

    /**
     * Creates a new Minecraft mod representation.
     * @param modPath The path to this mod.
     */
    constructor(modPath: string) {
        // Ensures '.jar' file extension
        const isModDotJar = modPath.endsWith(".jar") || modPath.endsWith(".jar.disabled");
        nodeAssert(isModDotJar, _error("MOD_EXPECTS_DOT_JAR", { path: modPath }));
        
        // Initializes class
        this.modPath = modPath;
    }

    /** Whether this mod is disabled. (MultiMC support) */
    get isModDisabled(): boolean {
        // Checks for '.jar.disabled' file extension
        return this.modPath.endsWith(".jar.disabled");
    }

    /**
     * Compiles the sha1 file hash of this mod.
     * @returns This mod's sha1 file hash.
     */
    async compileFileHash() {
        // Hashes file content
        return nodeCrypto.hash("sha1", await nodeFs.readFile(this.modPath));
    }
}

/** A generic representation of a Minecraft mod. */
export class GenericMinecraftMod extends MinecraftMod {
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
        nodeAssert(false, _error("MOD_INVALID_OR_UNSUPPORTED_MOD_FLAVOR", { path: this.modPath }));
    }

    /**
     * Parses this mod as a Fabric mod.
     * @returns A Fabric representation of this mod.
     */
    async parseAsFabricMod(): Promise<FabricMinecraftMod> {
        // Ensures existence of 'fabric.mod.json'
        const zip = new AdmZip(this.modPath);
        const entry = zip.getEntry("fabric.mod.json");
        nodeAssert(entry !== null, _error("FABRIC_MOD_MISSING_FABRIC_MOD_JSON", { path: this.modPath }));

        // Parses metadata from 'fabric.mod.json'
        const metadata = await new Promise<FabricModJSON>((resolve, reject) => {
            entry.getDataAsync((data, error) => {
                if(typeof error !== "undefined") reject(error);
                try {
                    resolve(JSON.parse(data.toString()));
                }
                catch {
                    reject(_error("FABRIC_MOD_BROKEN_FABRIC_MOD_JSON", { path: this.modPath }));
                }
            })
        });

        // Upgrades representation
        return new FabricMinecraftMod(this.modPath, metadata);
    }
}

/** A Fabric representation of a Minecraft mod. */
export class FabricMinecraftMod extends MinecraftMod {
    /** The metadata of this mod. */
    readonly metadata: FabricModJSON;
    
    /** Creates a new Fabric Minecraft mod representation. */
    constructor(modPath: string, metadata: FabricModJSON) {
        // Extends parent
        super(modPath);

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
