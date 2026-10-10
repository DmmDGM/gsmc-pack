// Imports
import { readdir as readDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { cwd as getCurrentDirectory } from "node:process";
import {
    DEFAULT_GSMCPACK_JSON,
    error,
    GSMCPackJSON,
    MinecraftEnvironment,
    MinecraftLoaderEnum,
    MinecraftQuery,
    MinecraftRegistryEnum
} from "./common";
import MinecraftAddon from "./minecraft-addon";
import MinecraftRegistry from "./minecraft-registry";
import CurseForgeRegistry from "./registries/curseforge-registry";
import ModrinthRegistry from "./registries/modrinth-registry";

/** Minecraft instance. */
export default class MinecraftInstance {
    /** Instance directory path. */
    readonly dirpath: string;
    /** Supported Minecraft registries. */
    readonly registries: MinecraftRegistry[];

    /**
     * Creates new Minecraft instance.
     * @param dirpath Instance directory path.
     */
    constructor(dirpath: string = getCurrentDirectory(), registries: MinecraftRegistry[] = [
        new ModrinthRegistry(),
        new CurseForgeRegistry()
    ]) {
        // Inits fields
        this.dirpath = dirpath;
        this.registries = registries;
    }

    /**
     * Adds (or replace existing) upstream string.
     * @param upstream Upstring string.
     */
    async addUpstream(upstream: string): Promise<void> {
        // Loads upstream string
        const { hash } = MinecraftRegistry.loadUpstream(upstream);
        
        // Updates pack
        const pack = await this.loadGSMCPackJSON();
        pack.addons[hash] = upstream;
        await this.saveGSMCPackJSON(pack);
    }

    /**
     * Lists addons.
     * @returns Minecraft addons.
     */
    async listAddons(): Promise<MinecraftAddon[]> {
        // Lists addons
        const pack = await this.loadGSMCPackJSON();
        const hashes = new Set(Object.keys(pack.addons));
        const addons: MinecraftAddon[] = [];
        for(const file of await this.listFiles()) {
            const hash = Bun.CryptoHasher.hash("sha1", await file.arrayBuffer()).toHex();
            if(hashes.delete(hash) || hash in pack.addons) addons.push(new MinecraftAddon(this, file.name!, pack.addons[hash]));
            else addons.push(new MinecraftAddon(this, file.name!, null));
        }
        addons.push(...Array.from(hashes).map((hash) => new MinecraftAddon(this, null, pack.addons[hash])));        
        return addons;
    }

    /**
     * List files.
     * @returns Bun files.
     */
    async listFiles(): Promise<Bun.BunFile[]> {
        // List files
        return [
            ...await this.readDatapacksSubdirectory(),
            ...await this.readModsSubdirectory(),
            ...await this.readPluginsSubdirectory(),
            ...await this.readResourcepacksSubdirectory(),
            ...await this.readShaderpacksSubdirectory()
        ];
    }

    /**
     * Loads GSMC-Pack JSON file.
     * @returns GSMC-Pack JSON.
     */
    async loadGSMCPackJSON(): Promise<GSMCPackJSON> {
        // Loads pack
        try { return await Bun.file(resolvePath(this.dirpath, "gsmc-pack.json")).json() as GSMCPackJSON; }

        // Returns fallback
        catch { return structuredClone(DEFAULT_GSMCPACK_JSON); }
    }

    /**
     * Parses upstream query.
     * @param query Upstream query.
     * @returns Minecraft query.
     */
    parseQuery(query: string): MinecraftQuery {
        // Parses match
        const match = query.match(/^(?:([^:@#=]+):)?([^:@#=]+)(?:@([^:@#=]+))?(?:#([^:@#=]+))?(?:=([^:@#=]+))?$/);
        if(match === null) throw new Error(error("BAD_QUERY", { query }));

        // Creates query
        const [ _query, _registry, _lookup, _tag, _loader, _minecraft ] = match;
        const hasRegistry = typeof _registry !== "undefined" && this.registries.some(({ registry }) => registry === _registry.toUpperCase());
        const hasLoader = typeof _loader !== "undefined" && _loader.toUpperCase() in MinecraftLoaderEnum;
        return {
            loader: hasLoader ? _loader.toUpperCase() as MinecraftLoaderEnum : null,
            lookup: _lookup ?? "",
            minecraft: _minecraft ?? null,
            query: _query,
            registry: hasRegistry ? _registry.toUpperCase() as MinecraftRegistryEnum : null,
            tag: _tag ?? "latest"
        };
    }

    /**
     * Reads datapacks subdirectory.
     * @returns Datapack files.
     */
    async readDatapacksSubdirectory(): Promise<Bun.BunFile[]> {
        // Reads subdirectory
        try {
            const directory = resolvePath(this.dirpath, MinecraftAddon.getDatapacksSubdirectory());
            const files: Bun.BunFile[] = [];
            for(const datapack of await readDirectory(directory)) {
                const file = Bun.file(resolvePath(directory, datapack));
                if(file.type !== "application/java-archive") continue;
                files.push(file);
            }
            return files;
        }
        catch { return []; }
    }

    /**
     * Reads mods subdirectory.
     * @returns Mod files.
     */
    async readModsSubdirectory(): Promise<Bun.BunFile[]> {
        // Reads subdirectory
        try {
            const directory = resolvePath(this.dirpath, MinecraftAddon.getModsSubdirectory());
            const files: Bun.BunFile[] = [];
            for(const mod of await readDirectory(directory)) {
                const file = Bun.file(resolvePath(directory, mod));
                if(file.type !== "application/java-archive") continue;
                files.push(file);
            }
            return files;
        }
        catch { return []; }
    }

    /**
     * Reads plugins subdirectory.
     * @returns Plugin files.
     */
    async readPluginsSubdirectory(): Promise<Bun.BunFile[]> {
        // Reads subdirectory
        try {
            const directory = resolvePath(this.dirpath, MinecraftAddon.getPluginsSubdirectory());
            const files: Bun.BunFile[] = [];
            for(const plugin of await readDirectory(directory)) {
                const file = Bun.file(resolvePath(directory, plugin));
                if(file.type !== "application/java-archive") continue;
                files.push(file);
            }
            return files;
        }
        catch { return []; }
    }

    /**
     * Reads resourcepacks subdirectory.
     * @returns Resourcepack files.
     */
    async readResourcepacksSubdirectory(): Promise<Bun.BunFile[]> {
        // Reads subdirectory
        try {
            const directory = resolvePath(this.dirpath, MinecraftAddon.getResourcepacksSubdirectory());
            const files: Bun.BunFile[] = [];
            for(const resourcepacks of await readDirectory(directory)) {
                const file = Bun.file(resolvePath(directory, resourcepacks));
                if(file.type !== "application/zip") continue;
                files.push(file);
            }
            return files;
        }
        catch { return []; }
    }

    /**
     * Reads shaderpacks subdirectory.
     * @returns Shaderpack files.
     */
    async readShaderpacksSubdirectory(): Promise<Bun.BunFile[]> {
        // Reads subdirectory
        try {
            const directory = resolvePath(this.dirpath, MinecraftAddon.getShaderpacksSubdirectory());
            const files: Bun.BunFile[] = [];
            for(const shaderpacks of await readDirectory(directory)) {
                const file = Bun.file(resolvePath(directory, shaderpacks));
                if(file.type !== "application/zip") continue;
                files.push(file);
            }
            return files;
        }
        catch { return []; }
    }

    /**
     * Removes upstream string.
     * @param hash SHA-1 hash.
     */
    async removeUpstream(hash: string): Promise<void> {
        // Updates pack
        const pack = await this.loadGSMCPackJSON();
        if(hash in pack.addons) delete pack.addons[hash];
        else throw new Error("REMOVE_NO_ADDON");
        await this.saveGSMCPackJSON(pack);
    }

    /**
     * Resolves upstream string from upstream query.
     * @param query Upstream query.
     * @returns Upstream string.
     */
    async resolveQuery(query: string): Promise<string> {
        // Parses query
        const override = this.parseQuery(query);
        
        // Loads environment
        const pack = await this.loadGSMCPackJSON();
        const environment: MinecraftEnvironment = {
            "datapackLoader": override.loader === null ? pack.environment.datapackLoader : override.loader,
            "minecraft": override.minecraft === null ? pack.environment.minecraft : override.minecraft,
            "resourcepackLoader": override.loader === null ? pack.environment.resourcepackLoader : override.loader,
            "custompackLoader": override.loader === null ? pack.environment.custompackLoader : override.loader,
            "shaderpackLoader": override.loader === null ? pack.environment.shaderpackLoader : override.loader
        };

        // Resolves query
        const registries = override.registry === null ? this.registries :
            this.registries.filter(({ registry }) => registry === override.registry);
        for(const registry of registries) {
            // Resolves latest
            if(override.tag === "latest") {
                // Resolves query by ID
                try {
                    const upstreams = await registry.fetchUpstreamsFromID(environment.minecraft, override.lookup);
                    const results = upstreams.filter((upstream) => MinecraftRegistry.satisfiesEnvironment(upstream, environment));
                    if(results.length > 0) return results[0];
                }
                catch {}

                // Resolves query by slug
                try {
                    const slug = await registry.fetchIDFromSlug(override.lookup);
                    const upstreams = await registry.fetchUpstreamsFromID(environment.minecraft, slug);
                    const results = upstreams.filter((upstream) => MinecraftRegistry.satisfiesEnvironment(upstream, environment));
                    if(results.length > 0) return results[0];
                }
                catch {}
            }

            // Resolves tag
            else {
                // Resolves query by ID
                try {
                    const upstream = await registry.fetchUpstreamFromTag(override.lookup, override.tag);
                    return upstream;
                }
                catch {}

                // Resolves query by slug
                try {
                    const slug = await registry.fetchIDFromSlug(override.lookup);
                    const upstream = await registry.fetchUpstreamFromTag(slug, override.tag);
                    return upstream;
                }
                catch {}
            }
        }
        
        // Throws error
        throw new Error(error("REGISTRY_NO_UPSTREAM"));
    }

    /**
     * Saves GSMC-Pack JSON file.
     * @param pack GSMC-Pack JSON.
     */
    async saveGSMCPackJSON(pack: GSMCPackJSON): Promise<void> {
        // Saves pack
        await Bun.file(resolvePath(this.dirpath, "gsmc-pack.json")).write(JSON.stringify(pack, null, 4));
    }
}
