// Imports
import { mkdtemp as makeTemporaryDirectory, rmdir as removeDirectory } from "node:fs/promises";
import { tmpdir as getTemporaryDirectory } from "node:os";
import { resolve as resolvePath } from "node:path";
import {
    error,
    MINECRAFT_LOADER_TYPE_MAP,
    MinecraftDownload,
    MinecraftEnvironment,
    MinecraftLoaderEnum,
    MinecraftRegistryEnum,
    MinecraftTypeEnum,
    MinecraftUpstream
} from "./common";

/** Minecraft registry. */
export default abstract class MinecraftRegistry {
    /**
     * Downloads source file from upstream string.
     * @param upstream Upstream string.
     * @returns Minecraft download.
     */
    static async downloadSource(upstream: string): Promise<MinecraftDownload> {
        // Loads upstream
        const { hash, url } = MinecraftRegistry.loadUpstream(upstream);

        // Makes request
        const response = await fetch(url);
        if(!response.ok) throw new Error(error("BAD_UPSTREAM", { upstream }));

        // Estimates size
        const size = Number(response.headers.get("content-length"));
        if(isNaN(size)) throw new Error(error("BAD_UPSTREAM", { upstream }));

        // Makes download filename
        const filename = decodeURIComponent(response.url).split("/").at(-1) ?? null;
        if(filename === null) throw new Error(error("BAD_UPSTREAM", { upstream }));

        // Makes download directory
        const directory = await makeTemporaryDirectory(resolvePath(getTemporaryDirectory(), "gsmc-pack-"));
        
        // Makes download promise
        const download = new Promise<ArrayBuffer>(async (resolve, reject) => {
            // Writes response
            await Bun.write(resolvePath(directory, filename), response);

            // Verifies hash
            const buffer = await Bun.file(resolvePath(directory, filename)).arrayBuffer();
            const fileHash = Bun.CryptoHasher.hash("sha1", buffer).toHex();
            if(hash !== fileHash) return reject(error("BAD_UPSTREAM", { upstream }));

            // Resolves buffer
            return resolve(buffer);
        });

        // Makes progress helper
        const progress = async (): Promise<number> => {
            // Checks download progress
            try {
                const stat = await Bun.file(resolvePath(directory, filename)).stat();
                return stat.size;
            }
            catch { throw new Error(error("BAD_PROGRESS")); }
        };

        // Makes dispose helper
        let disposed: boolean = false;
        const dispose = async (): Promise<void> => {
            // Disposes download file
            try {
                await Bun.file(resolvePath(directory, filename)).unlink();
                await removeDirectory(directory);
            }
            catch { throw new Error(error("BAD_DISPOSE")); }
            finally { disposed = true; }
        };

        // Creates download
        return { directory, dispose, get disposed() { return disposed; }, download, filename, hash, progress, size, upstream, url };
    }

    /**
     * Creates upstream string from upstream.
     * @param upstream Upstream.
     * @returns Upstream string.
     */
    static dumpUpstream(upstream: MinecraftUpstream): string {
        // Creates upstream string
        const { hash, id, minecrafts, loaders, registry, tag, types, url } = upstream;
        return [ registry, minecrafts.join(";"), types.join(";"), loaders.join(";"), id, tag, hash, url ].join("::");
    }

    /**
     * Estimates download size of source file.
     * @param upstream Upstream string.
     * @returns Download size.
     */
    static async estimateSource(upstream: string): Promise<number> {
        // Loads upstream
        const { url } = MinecraftRegistry.loadUpstream(upstream);

        // Makes request
        const response = await fetch(url, { method: "HEAD" });
        if(!response.ok) throw new Error(error("BAD_UPSTREAM"));

        // Estimates size
        const size = Number(response.headers.get("content-length"));
        if(isNaN(size)) throw new Error(error("BAD_UPSTREAM"));
        return size;
    }

    /**
     * Infers upstream type from upstream string.
     * @param upstream Upstream string.
     * @returns Upstream type.
     */
    static inferUpstreamType(upstream: string, environment: MinecraftEnvironment): MinecraftTypeEnum {
        // Loads upstream
        const { types } = MinecraftRegistry.loadUpstream(upstream);
        
        // Infers upstream type
        if(MINECRAFT_LOADER_TYPE_MAP[environment.custompackLoader] === MinecraftTypeEnum.PLUGIN) {
            if(types.includes(MinecraftTypeEnum.PLUGIN)) return MinecraftTypeEnum.PLUGIN;
            if(types.includes(MinecraftTypeEnum.DATAPACK)) return MinecraftTypeEnum.DATAPACK;
        }
        if(MINECRAFT_LOADER_TYPE_MAP[environment.custompackLoader] === MinecraftTypeEnum.MOD) {
            if(types.includes(MinecraftTypeEnum.MOD)) return MinecraftTypeEnum.MOD;
            if(types.includes(MinecraftTypeEnum.DATAPACK)) return MinecraftTypeEnum.DATAPACK;
        }
        if(types.includes(MinecraftTypeEnum.DATAPACK)) return MinecraftTypeEnum.DATAPACK;
        if(types.includes(MinecraftTypeEnum.MOD)) return MinecraftTypeEnum.MOD;
        if(types.includes(MinecraftTypeEnum.PLUGIN)) return MinecraftTypeEnum.PLUGIN;
        if(types.includes(MinecraftTypeEnum.RESOURCEPACK)) return MinecraftTypeEnum.RESOURCEPACK;
        if(types.includes(MinecraftTypeEnum.SHADERPACK)) return MinecraftTypeEnum.SHADERPACK;
        throw new Error(error("BAD_UPSTREAM"));
    }

    /**
     * Creates upstream from upstream string.
     * @param upstream Upstream string.
     * @returns Upstream.
     */
    static loadUpstream(upstream: string): MinecraftUpstream {
        // Creates upstream
        const [ _registry, _minecrafts, _types, _loaders, id, tag, hash, url ] = upstream.split("::");
        const registry = _registry as MinecraftRegistryEnum;
        const loaders = _loaders.split(";") as MinecraftLoaderEnum[];
        const minecrafts = _minecrafts.split(";");
        const types = _types.split(";") as MinecraftTypeEnum[];
        return { hash, loaders, minecrafts, id, registry, tag, types, url };
    }

    /**
     * Checks whether upstream string satisfies Minecraft environment.
     * @param upstream Upstream string.
     * @param environment Minecraft environment.
     * @returns Whether upstream string satisfies Minecraft environment.
     */
    static satisfiesEnvironment(upstream: string, environment: MinecraftEnvironment): boolean {
        // Loads upstream
        const { loaders, minecrafts } = MinecraftRegistry.loadUpstream(upstream);
        
        // Checks Minecrafts
        if(!minecrafts.includes(environment.minecraft)) return false;

        // Checks loaders
        switch(MinecraftRegistry.inferUpstreamType(upstream, environment)) {
            case MinecraftTypeEnum.DATAPACK: return loaders.includes(environment.datapackLoader);
            case MinecraftTypeEnum.MOD: return loaders.includes(environment.custompackLoader);
            case MinecraftTypeEnum.PLUGIN: return loaders.includes(environment.custompackLoader);
            case MinecraftTypeEnum.RESOURCEPACK: return loaders.includes(environment.resourcepackLoader);
            case MinecraftTypeEnum.SHADERPACK: return loaders.includes(environment.shaderpackLoader);
        }
    }

    // Declares abstract methods
    abstract readonly registry: MinecraftRegistryEnum;
    abstract fetchIDFromSlug(slug: string): Promise<string>;
    abstract fetchUpstreamFromFilepath(filepath: string): Promise<string>;
    abstract fetchUpstreamFromTag(id: string, tag: string): Promise<string>;
    abstract fetchUpstreamsFromID(minecraft: string, id: string): Promise<string[]>;
}
