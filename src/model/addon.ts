// Imports
import type { MinecraftInstance } from "./instance";
import AdmZip from "adm-zip";
import fingerprinter from "@meza/curseforge-fingerprint";
import { MinecraftAddonMetadata } from "../core/metadata";

/** Represents a Minecraft addon. */
export abstract class MinecraftAddon {
    /** The instance that owns this addon. */
    readonly instance: MinecraftInstance;
    /** The metadata of this addon. */
    readonly metadata: MinecraftAddonMetadata | null;
    /** The path to this addon. */
    readonly path: string;

    /**
     * Creates a new Minecraft addon instance.
     * @param instance The instance that owns this addon.
     * @param path The path to this addon.
     * @param metadata The metadata of this addon.
     */
    constructor(instance: MinecraftInstance, path: string, metadata: MinecraftAddonMetadata | null) {
        // Initializes instance
        this.instance = instance;
        this.metadata = metadata;
        this.path = path;
    }

    /**
     * Compiles synchronously the CurseForge file fingerprint of this addon.
     * @returns The CurseForge file fingerprint of this addon.
     */
    compileCurseForgeFileFingerprint(): number {
        // Compiles fingerprint
        return fingerprinter.fingerprint(this.path);
    }

    /**
     * Compiles asynchronously the sha1 file hash of this addon.
     * @returns The sha1 file hash of this addon.
     */
    async compileSha1FileHash(): Promise<string> {
        // Compiles hash
        return Bun.CryptoHasher.hash("sha1", await Bun.file(this.path).arrayBuffer()).toHex();
    }

    /**
     * Downloads this addon using its metadata.
     * @returns An array of the file being downloaded to, the size of the download, and the asynchronous promise for the download.
     */
    abstract downloadFileFromMetadata(): Promise<[ Bun.BunFile, number, Promise<boolean> ]>;

    /**
     * Creates an AdmZip instance of this addon.
     * @returns The AdmZip instance of this addon.
     */
    parseAdmArchiveFile(): AdmZip {
        return new AdmZip(this.path);
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this addon's metadata from its source file instead.
     * @returns A new instance of the same addon with a rebuilt metadata.
     */
    abstract rebuildMetadataFromSourceFile(): Promise<MinecraftAddon>;

    /**
     * Abandons existing upstream in 'gsmc-pack.json' and rebuilds this addon's upstream from an available registry instead.
     * @returns A new upstream of this addon.
     */
    abstract rebuildUpstreamFromRegistry(): Promise<string>;
}
