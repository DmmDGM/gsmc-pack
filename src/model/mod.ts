// Imports
import type { MinecraftInstance } from "./instance";
import nodeAssert from "node:assert";
import { relative as relativePath } from "node:path";
import { format } from "../core/errors";
import { MinecraftAddon } from "./addon";
import { MinecraftAddonFlavor } from "../core/flavor";
import { MinecraftAddonMetadata } from "../core/metadata";
import { MinecraftAddonType } from "../core/type";
import { CurseForgeRegistry } from "../registry/curseforge";
import { ModrinthRegistry } from "../registry/modrinth";

/** Represents a Minecraft mod. */
export class MinecraftMod extends MinecraftAddon {
    /**
     * Creates a new Minecraft mod instance.
     * @param instance The instance that owns this mod.
     * @param path The path to this mod.
     * @param metadata The metadata of this mod.
     */
    constructor(instance: MinecraftInstance, path: string, metadata: MinecraftAddonMetadata | null) {
        // Ensures '.jar' file extension
        const isSourceFileDotJar = path.endsWith(".jar") || path.endsWith(".jar.disabled");
        nodeAssert(isSourceFileDotJar, format("MOD:SOURCE_FILE_NOT_A_DOT_JAR", { path }));

        // Initializes parent
        super(instance, path, metadata);
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file's 'fabric.mod.json' file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromFabricModJSON(): Promise<MinecraftMod & { metadata: MinecraftAddonMetadata; }> {
        // Ensures existence of 'fabric.mod.json'
        const entry = this.parseAdmArchiveFile().getEntry("fabric.mod.json");
        nodeAssert(entry !== null, format("MOD:REBUILD_MISSING_FABRIC_MOD_JSON", { path: this.path }));

        // Reads contents from 'fabric.mod.json'
        const metadata = await new Promise<MinecraftAddonMetadata>((resolve, reject) => {
            entry.getDataAsync(async (data, error) => {
                // Handles error
                if(typeof error !== "undefined") reject(error);

                // Parses metadata from 'fabric.mod.json'
                try {
                    const json = JSON.parse(data.toString()) as {
                        id: string;
                        name: string;
                        version: string;
                    };
                    const isGoodFabricModJSON = "id" in json && "name" in json && "version" in json;
                    nodeAssert(isGoodFabricModJSON, format("MOD:REBUILD_BAD_FABRIC_MOD_JSON", { path: this.path }));
                    resolve({
                        flavor: MinecraftAddonFlavor.FABRIC,
                        id: json["id"],
                        name: json["name"],
                        path: relativePath(this.instance.path, this.path),
                        type: MinecraftAddonType.MOD,
                        upstream: await this.rebuildUpstreamFromRegistry(),
                        version: json["version"],
                    });
                }
                catch(error) {
                    reject(error);
                }
            });
        });

        // Rebuilds instance from metadata
        return new MinecraftMod(this.instance, this.path, metadata) as MinecraftMod & { metadata: MinecraftAddonMetadata; };
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file's 'META-INF/mods.toml' file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromMetaInfModsTOML(): Promise<MinecraftMod & { metadata: MinecraftAddonMetadata; }> {
        // Ensures existence of 'META-INF/mods.toml'
        const entry = this.parseAdmArchiveFile().getEntry("META-INF/mods.toml");
        nodeAssert(entry !== null, format("MOD:REBUILD_MISSING_META_INF_MODS_TOML", { path: this.path }));

        // Reads contents from 'META-INF/mods.toml'
        const metadata = await new Promise<MinecraftAddonMetadata>((resolve, reject) => {
            entry.getDataAsync(async (data, error) => {
                // Handles error
                if(typeof error !== "undefined") reject(error);

                // Parses metadata from 'META-INF/mods.toml'
                try {
                    const toml = Bun.TOML.parse(data.toString()) as {
                        mods: {
                            displayName: string;
                            modId: string;
                            version: string;
                        }[];
                    };
                    const isGoodMetaInfModsTOML = toml.mods.length > 0 && "modId" in toml.mods[0] && "displayName" in toml.mods[0] && "version" in toml.mods[0];
                    nodeAssert(isGoodMetaInfModsTOML, format("MOD:REBUILD_BAD_META_INF_MODS_TOML", { path: this.path }));
                    resolve({
                        flavor: MinecraftAddonFlavor.FORGE,
                        id: toml.mods[0]["modId"],
                        name: toml.mods[0]["displayName"],
                        path: relativePath(this.instance.path, this.path),
                        type: MinecraftAddonType.MOD,
                        upstream: await this.rebuildUpstreamFromRegistry(),
                        version: toml.mods[0]["version"],
                    });
                }
                catch(error) {
                    reject(error);
                }
            });
        });

        // Rebuilds instance from metadata
        return new MinecraftMod(this.instance, this.path, metadata) as MinecraftMod & { metadata: MinecraftAddonMetadata; };
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file's 'META-INF/neoforge.mods.toml' file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromMetaInfNeoForgeModsTOML(): Promise<MinecraftMod & { metadata: MinecraftAddonMetadata; }> {
        // Ensures existence of 'META-INF/neoforge.mods.toml'
        const entry = this.parseAdmArchiveFile().getEntry("META-INF/neoforge.mods.toml");
        nodeAssert(entry !== null, format("MOD:REBUILD_MISSING_META_INF_NEO_FORGE_MODS_TOML", { path: this.path }));

        // Reads contents from 'META-INF/neoforge.mods.toml'
        const metadata = await new Promise<MinecraftAddonMetadata>((resolve, reject) => {
            entry.getDataAsync(async (data, error) => {
                // Handles error
                if(typeof error !== "undefined") reject(error);

                // Parses metadata from 'META-INF/neoforge.mods.toml'
                try {
                    const toml = Bun.TOML.parse(data.toString()) as {
                        mods: {
                            displayName: string;
                            modId: string;
                            version: string;
                        }[];
                    };
                    const isGoodMetaInfModsTOML = toml.mods.length > 0 && "modId" in toml.mods[0] && "displayName" in toml.mods[0] && "version" in toml.mods[0];
                    nodeAssert(isGoodMetaInfModsTOML, format("MOD:REBUILD_BAD_META_INF_NEO_FORGE_MODS_TOML", { path: this.path }));
                    resolve({
                        flavor: MinecraftAddonFlavor.NEO_FORGE,
                        id: toml.mods[0]["modId"],
                        name: toml.mods[0]["displayName"],
                        path: relativePath(this.instance.path, this.path),
                        type: MinecraftAddonType.MOD,
                        upstream: await this.rebuildUpstreamFromRegistry(),
                        version: toml.mods[0]["version"],
                    });
                }
                catch(error) {
                    reject(error);
                }
            });
        });

        // Rebuilds instance from metadata
        return new MinecraftMod(this.instance, this.path, metadata) as MinecraftMod & { metadata: MinecraftAddonMetadata; };
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromSourceFile(): Promise<MinecraftMod & { metadata: MinecraftAddonMetadata; }> {
        // Checks 'fabric.mod.json' file
        try {
            return await this.rebuildMetadataFromFabricModJSON();
        }
        catch {}
        
        // Checks 'META-INF/neoforge.mods.toml' file
        try {
            return await this.rebuildMetadataFromMetaInfNeoForgeModsTOML();
        }
        catch {}

        // Checks 'META-INF/mods.toml' file
        try {
            return await this.rebuildMetadataFromMetaInfModsTOML();
        }
        catch {}

        // Throws error
        nodeAssert(false, format("MOD:REBUILD_MISSING_METADATA_IN_SOURCE_FILE", { path: this.path }));
    }

    /**
     * Abandons existing upstream in 'gsmc-pack.json' and rebuilds this mod's upstream from an available registry instead.
     * @returns A new upstream of this mod.
     */
    async rebuildUpstreamFromRegistry(): Promise<string> {
        // Checks Modrinth registry
        try {
            const hash = await this.compileSha1FileHash();
            const upstream = await ModrinthRegistry.fetchUpstreamFromFileHash(hash);
            return `${upstream.registry}::${upstream.major}@${upstream.minor}::${upstream.minecraft}::${upstream.url}::${upstream.date}`;
        }
        catch {}

        // Checks CurseForge registry
        try {
            const fingerprint = this.compileCurseForgeFileFingerprint();
            const upstream = await CurseForgeRegistry.fetchUpstreamFromFileFingerprint(fingerprint);
            return `${upstream.registry}::${upstream.major}@${upstream.minor}::${upstream.minecraft}::${upstream.url}::${upstream.date}`;
        }
        catch {}

        // Throws error
        nodeAssert(false, format("MOD:REBUILD_NO_VALID_UPSTREAM_REGISTRY", { path: this.path }));
    }
}
