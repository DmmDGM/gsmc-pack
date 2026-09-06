// Imports
import nodeAssert from "node:assert";
import AdmZip from "adm-zip";
import { _error } from "./core";

/** A list of supported Minecraft mod flavors in gsmc-pack. */
export enum MinecraftModFlavor {
    FABRIC,
    FORGE,
    NEOFORGE
}

/** Represents a Minecraft mod. */
export class MinecraftMod {
    /** The path to this Minecraft mod. */
    readonly modPath: string;

    /**
     * Creates a new Minecraft mod representation.
     * @param modPath The path to this Minecraft mod.
     */
    constructor(modPath: string) {
        // Checks for '.jar' file extension
        const isModDotJar = modPath.endsWith(".jar") || modPath.endsWith(".jar.disabled");
        nodeAssert(isModDotJar, _error("MOD_EXPECTS_DOT_JAR", { path: modPath }));
        
        // Initializes class
        this.modPath = modPath;
    }

    /** Whether this Minecraft mod is disabled. (MultiMC support) */
    get isModDisabled(): boolean {
        // Checks for '.jar.disabled' file extension
        return this.modPath.endsWith(".jar.disabled");
    }

    /**
     * Guesses the flavor of this Miencraft mod.
     * @returns A best guess of this Minecraft mod's flavor.
     */
    async guessModFlavor(): Promise<MinecraftModFlavor> {
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
     * Parses this Minecraft mod as a Fabric mod.
     * @returns A Fabric Minecraft mod representation of this Minecraft mod.
     */
    parseAsFabricMod(): Promise<FabricMinecraftMod> {
        // Checks existence of 'fabric.mod.json'
        const zip = new AdmZip(this.modPath);
        const metadata = zip.getEntry("fabric.mod.json");
        nodeAssert(metadata !== null, _error("FABRIC_MOD_MISSING_FABRIC_MOD_JSON", { path: this.modPath }));

        // Parses 'fabric.mod.json' as JSON
        return new Promise((resolve, reject) => {
            metadata.getDataAsync((data, error) => {
                if(typeof error !== "undefined") reject(error);
                try {
                    resolve(JSON.parse(data.toString()));
                }
                catch {
                    reject(_error("FABRIC_MOD_BROKEN_FABRIC_MOD_JSON", { path: this.modPath }));
                }
            })
        });
    }
}

export abstract class FlavoredMinecraftMod {

}

export class FabricMinecraftMod extends FlavoredMinecraftMod {

}

export class ForgeMinecraftMod extends FlavoredMinecraftMod {
    
}

export class NeoforgeMinecraftMod extends FlavoredMinecraftMod {

}
