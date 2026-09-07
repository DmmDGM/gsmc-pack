// Imports
import type { GSMCPackJSON } from "./instance";
import nodeAssert from "node:assert";
import curseforge from "@meza/curseforge-fingerprint";
import AdmZip from "adm-zip";
import { _error, MinecraftAddonType, MinecraftModFlavor, MinecraftRegistryType } from "./common";
import { CurseForgeRegistry } from "./curseforge";
import { ModrinthRegistry } from "./modrinth";

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
}

/** A representation of an abstract Minecraft mod. */
export class AbstractMinecraftMod extends MinecraftMod {
    /**
     * Compiles the CurseForge file fingerprint of this mod.
     * @returns This mod's CurseForge file fingerprint.
     */
    compileFileFingerprint(): number {
        // Fingerprints file content
        return curseforge.fingerprint(this.path);
    }

    /**
     * Compiles the sha1 file hash of this mod.
     * @returns This mod's sha1 file hash.
     */
    async compileFileHash(): Promise<string> {
        // Hashes file content
        return Bun.CryptoHasher.hash("sha1", await Bun.file(this.path).bytes()).toHex();
    }

    /**
     * Parses this mod as a Fabric mod.
     * @returns A Fabric representation of this mod.
     */
    async parseAsFabricMod(): Promise<FlavoredMinecraftMod> {
        // Ensures existence of 'fabric.mod.json'
        const zip = new AdmZip(this.path);
        const entry = zip.getEntry("fabric.mod.json");
        nodeAssert(entry !== null, _error("FABRIC_MOD:MISSING_FABRIC_MOD_JSON", { path: this.path }));

        // Parses metadata from 'fabric.mod.json'
        const metadata = await new Promise<GSMCPackJSON["addons"][string]>((resolve, reject) => {
            entry.getDataAsync(async (data, error) => {
                // Checks zip error
                if(typeof error !== "undefined") reject(error);

                // Parses metadata json
                try {
                    const json = JSON.parse(data.toString());
                    nodeAssert("id" in json && "name" in json && "version" in json, _error("FABRIC_MOD:BROKEN_FABRIC_MOD_JSON", { path: this.path }));
                    resolve({
                        flavor: MinecraftModFlavor.FABRIC,
                        id: json["id"],
                        name: json["name"],
                        type: MinecraftAddonType.MOD,
                        upstream: await this.resolveModUpstream(),
                        version: json["version"],
                    });
                }
                catch(error) {
                    reject(error);
                }
            })
        });

        // Upgrades representation
        const hash = await this.compileFileHash();
        return new FlavoredMinecraftMod(this.path, hash, metadata);
    }

    async parseAsForgeMod() {}
    async parseAsNeoForgeMod() {}

    /**
     * Parses this mod as a flavored mod.
     * @returns A flavored representation of this mod.
     */
    async parseAsFlavoredMod(): Promise<FlavoredMinecraftMod> {
        // Attempts to parse this mod as Fabric mod
        try {
            return await this.parseAsFabricMod();
        }
        catch {}

        // Throws error
        nodeAssert(false, _error("MOD:INVALID_OR_UNSUPPORTED_FLAVOR", { path: this.path }));
    }

    /**
     * Resolves the upstream of this mod.
     * @returns This mod's upstream.
     */
    async resolveModUpstream(): Promise<string> {
        // Checks if Modrinth has this mod
        try {
            const hash = await this.compileFileHash();
            const project = await ModrinthRegistry.fetchProjectFromFileHash(hash);
            return `${MinecraftRegistryType.MODRINTH}::${project.id}+${project.version}::${project.url}`;
        }
        catch {}

        // Checks if CurseForge has this mod
        try {
            const fingerprint = this.compileFileFingerprint();
            const match = await CurseForgeRegistry.fetchMatchFromFileFingerprint(fingerprint);
            return `${MinecraftRegistryType.CURSE_FORGE}::${match.id}+${match.version}::${match.url}`;
        }
        catch {}

        // Throws error
        nodeAssert(false, _error("MOD:INVALID_OR_UNSUPPORTED_REGISTRY", { path: this.path }));
    }
}

/** A representation of a flavored Minecraft mod. */
export class FlavoredMinecraftMod extends AbstractMinecraftMod {
    /** The sha1 file hash of this mod. */
    readonly hash: string;
    /** The metadata of this mod. */
    readonly metadata: GSMCPackJSON["addons"][string];
    
    /** Creates a new Fabric Minecraft mod representation. */
    constructor(path: string, hash: string, metadata: GSMCPackJSON["addons"][string]) {
        // Extends parent
        super(path);

        // Initializes class
        this.hash = hash;
        this.metadata = metadata;
    }
}
