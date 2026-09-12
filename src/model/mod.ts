// Imports
import type { MinecraftInstance } from "./instance";
import nodeAssert from "node:assert";
import { basename as resolveBasename, relative as relativePath } from "node:path";
import { MinecraftAddon } from "./addon";
import { format } from "../core/errors";
import { MinecraftAddonFlavor } from "../core/flavor";
import { MinecraftAddonMetadata } from "../core/metadata";
import { MinecraftAddonRegistry } from "../core/registries";
import { MinecraftAddonType } from "../core/type";
import { MinecraftAddonUpstream } from "../core/upstream";
import { CurseForgeRegistry } from "../registry/curseforge";
import { ModrinthRegistry } from "../registry/modrinth";

/** Represents a Minecraft mod. */
export class MinecraftMod extends MinecraftAddon {
    /**
     * Creates a new Minecraft mod instance.
     * @param instance The instance that owns this mod.
     * @param path The path to this mod.
     * @param hash The sha1 hash of this mod.
     * @param metadata The metadata of this mod.
     */
    constructor(instance: MinecraftInstance, path: string, hash: string | null, metadata: MinecraftAddonMetadata | null) {
        // Ensures '.jar' file extension
        const isSourceFileDotJar = path.endsWith(".jar") || path.endsWith(".jar.disabled");
        nodeAssert(isSourceFileDotJar, format("MOD:SOURCE_FILE_NOT_A_DOT_JAR", { path }));

        // Initializes parent
        super(instance, path, hash, metadata);
    }

    /**
     * Checks for available updates from the upstream of this mod.
     * @returns Either the latest available update of this mod or null.
     */
    async checkUpdatableUpstream(): Promise<MinecraftAddonUpstream | null> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.instance.readPackFile();

        // Parses upstream from metadata
        const { major, registry } = this.parseUpstreamFromMetadata();
        
        // Checks upstream
        switch(registry) {
            case MinecraftAddonRegistry.CURSE_FORGE: {
                const upstreams = await CurseForgeRegistry.fetchMinorUpstreamsFromMajor(major.toString(), pack.environment[MinecraftAddonType.MOD], pack.minecraft);
                const upstream = upstreams.sort((a, b) => b.date - a.date)[0];
                return upstream.hash === this.hash ? null : upstream;
            }
            case MinecraftAddonRegistry.MODRINTH: {
                const upstreams = await ModrinthRegistry.fetchMinorUpstreamsFromMajor(major.toString(), pack.environment[MinecraftAddonType.MOD], pack.minecraft);
                const upstream = upstreams.sort((a, b) => b.date - a.date)[0];
                return upstream.hash === this.hash ? null : upstream;
            }
        }
    }

    /**
     * Parses the upstream of this mod using its metadata.
     * @returns The upstream of this mod.
     */
    parseUpstreamFromMetadata(): MinecraftAddonUpstream {
        // Ensures file hash and addon metadata
        nodeAssert(this.hash, format("MOD:UPSTREAM_MISSING_FILE_HASH", { path: this.path }));
        nodeAssert(this.metadata, format("MOD:UPSTREAM_MISSING_ADDON_METADATA", { path: this.path }));

        // Parses upstream
        const [ registry, ...parameters ] = this.metadata.upstream.split("::") as [ MinecraftAddonRegistry, ...string[] ];
        switch(registry) {
            case MinecraftAddonRegistry.CURSE_FORGE:
            case MinecraftAddonRegistry.MODRINTH: {
                const [ major, minor ] = parameters[0].split("@");
                const url = parameters[1];
                const date = parseInt(parameters[2]);
                return {
                    date: date,
                    file: resolveBasename(this.path),
                    hash: this.hash,
                    major: major,
                    minor: minor,
                    registry: registry,
                    url: url
                };
            }
        }
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file's 'fabric.mod.json' file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromFabricModJSON(): Promise<MinecraftMod> {
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
        return new MinecraftMod(this.instance, this.path, this.hash ?? await this.compileSha1FileHash(), metadata);
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file's 'META-INF/mods.toml' file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromMetaInfModsTOML(): Promise<MinecraftMod> {
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
        return new MinecraftMod(this.instance, this.path, this.hash ?? await this.compileSha1FileHash(), metadata);
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file's 'META-INF/neoforge.mods.toml' file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromMetaInfNeoForgeModsTOML(): Promise<MinecraftMod> {
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
        return new MinecraftMod(this.instance, this.path, this.hash ?? await this.compileSha1FileHash(), metadata);
    }

    /**
     * Abandons existing metadata in 'gsmc-pack.json' and rebuilds this mod's metadata from its source file instead.
     * @returns A new instance of the same mod with a rebuilt metadata.
     */
    async rebuildMetadataFromSourceFile(): Promise<MinecraftMod> {
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
            return `${upstream.registry}::${upstream.major}@${upstream.minor}::${upstream.url}::${upstream.date}`;
        }
        catch {}

        // Checks CurseForge registry
        try {
            const fingerprint = this.compileCurseForgeFileFingerprint();
            const upstream = await CurseForgeRegistry.fetchUpstreamFromFileFingerprint(fingerprint);
            return `${upstream.registry}::${upstream.major}@${upstream.minor}::${upstream.url}::${upstream.date}`;
        }
        catch {}

        // Throws error
        nodeAssert(false, format("MOD:REBUILD_NO_VALID_UPSTREAM_REGISTRY", { path: this.path }));
    }
}
