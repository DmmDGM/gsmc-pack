// Imports
import type { MinecraftDownload } from "./minecraft-download";
import { readdir as readDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { cwd as getCurrentDirectory } from "node:process";
import { CurseForgeRegistry } from "./registries/curseforge-registry";
import { MinecraftAddon } from "./minecraft-addon";
import { MinecraftEnvironment, MinecraftLoaderEnum, MinecraftRegistry, MinecraftTypeEnum } from "./minecraft-registry";
import { ModrinthRegistry } from "./registries/modrinth-registry";
import { error } from "./error";

/** GSMC-Pack JSON file. */
export interface PackJSON {
    /** Pack addons. */
    addons: { [ Hash in string ]: string; };
    /** Pack authors. */
    authors: string[];
    /** Pack description. */
    description: string;
    /** Preferred environment. */
    environment: MinecraftEnvironment;
    /** Pack name. */
    name: string;
    /** Pack version. */
    version: string;
}

/** Minecraft instance. */
export class MinecraftInstance {
    /** Default or fallback GSMC-Pack JSON. */
    readonly defaultPackJSON: PackJSON = {
        addons: {},
        authors: [],
        description: "",
        environment: {
            datapackLoader: MinecraftLoaderEnum.DATAPACK,
            minecraft: "26.3",
            resourcepackLoader: MinecraftLoaderEnum.RESOURCEPACK,
            custompackLoader: MinecraftLoaderEnum.FABRIC,
            shaderpackLoader: MinecraftLoaderEnum.IRIS
        },
        name: "",
        version: ""
    };
    /** Instance path. */
    readonly path: string;
    /** Supported Minecraft registries. */
    readonly registries: MinecraftRegistry[] = [
        new ModrinthRegistry(),
        new CurseForgeRegistry()
    ];

    /**
     * Creates new Minecraft instance.
     * @param path Instance path.
     */
    constructor(path: string = getCurrentDirectory()) {
        // Inits fields
        this.path = path;
    }

    /**
     * Adds upstream string.
     * @param upstream Upstring string.
     * @param commit Whether to modify instance.
     * @returns Updated pack.
     */
    async addUpstream(upstream: string, commit: boolean = false): Promise<PackJSON> {
        // Adds upstream string
        const pack = await this.readPackJSON();
        const { hash } = MinecraftRegistry.loadUpstream(upstream);
        pack.addons[hash] = upstream;

        // Writes pack file
        if(commit) await this.writePackJSON(pack);

        // Returns pack
        return pack;
    }

    /**
     * Deletes unlinked addons.
     * @param commit Whether to modify instance.
     */
    async *deleteUnlinked(commit: boolean = false): AsyncGenerator<MinecraftAddon, void, void> {
        // Deletes addons
        const { unlinked } = await this.listAddons();
        for(const addon of unlinked) yield addon.deleteSource(commit);
    }

    /**
     * Downloads missing addons.
     * @param commit Whether to modify instance.
     */
    async *downloadMissing(commit: boolean = false): AsyncGenerator<[ MinecraftDownload, Promise<MinecraftAddon> ], void, void> {
        // Downloads addons
        const { missing } = await this.listAddons();
        for(const addon of missing) yield addon.downloadSource(commit);
    }

    /**
     * Lists addons.
     * @returns List of linked addons, list of missing addons, and list of unlinked addons.
     */
    async listAddons(): Promise<{
        linked: MinecraftAddon[];
        missing: MinecraftAddon[];
        unlinked: MinecraftAddon[];
    }> {
        // Lists addons
        const pack = await this.readPackJSON();
        const files = await this.listFiles();
        const hashes = new Set(Object.keys(pack.addons));
        const linked: MinecraftAddon[] = [];
        const unlinked: MinecraftAddon[] = [];
        for(const file of files) {
            const hash = Bun.CryptoHasher.hash("sha1", await file.arrayBuffer()).toHex();
            if(hashes.delete(hash) || hash in pack.addons) linked.push(new MinecraftAddon(this, file, pack.addons[hash]));
            else unlinked.push(new MinecraftAddon(this, file, null));
        }
        const missing = Array.from(hashes).map((hash) => new MinecraftAddon(this, null, pack.addons[hash]));        
        
        // Returns results
        return { linked, missing, unlinked };
    }

    /**
     * Lists files.
     * @returns List of files.
     */
    async listFiles(): Promise<Bun.BunFile[]> {
        // Creates files
        const files: Bun.BunFile[] = [];

        // Includes datapack files
        try {
            const directory = resolvePath(this.path, MinecraftAddon.getDatapacksSubdirectory());
            const datapacks = await readDirectory(directory);
            for(const datapack of datapacks) {
                const file = Bun.file(resolvePath(directory, datapack));
                if(file.type === "application/zip") files.push(file);
            }
        }
        catch {}

        // Includes mod files
        try {
            const directory = resolvePath(this.path, MinecraftAddon.getModsSubdirectory());
            const mods = await readDirectory(directory);
            for(const mod of mods) {
                const file = Bun.file(resolvePath(directory, mod));
                if(file.type === "application/java-archive") files.push(file);
            }
        }
        catch {}

        // Includes plugin files
        try {
            const directory = resolvePath(this.path, MinecraftAddon.getPluginsSubdirectory());
            const plugins = await readDirectory(directory);
            for(const plugin of plugins) {
                const file = Bun.file(resolvePath(directory, plugin));
                if(file.type === "application/java-archive") files.push(file);
            }
        }
        catch {}

        // Includes resourcepack files
        try {
            const directory = resolvePath(this.path, MinecraftAddon.getResourcepacksSubdirectory());
            const resoucepacks = await readDirectory(directory);
            for(const resourcepack of resoucepacks) {
                const file = Bun.file(resolvePath(directory, resourcepack));
                if(file.type === "application/zip") files.push(file);
            }
        }
        catch {}

        // Includes shaderpack files
        try {
            const directory = resolvePath(this.path, MinecraftAddon.getShaderpacksSubdirectory());
            const shaderpacks = await readDirectory(directory);
            for(const shaderpack of shaderpacks) {
                const file = Bun.file(resolvePath(directory, shaderpack));
                if(file.type === "application/zip") files.push(file);
            }
        }
        catch {}

        // Returns files
        return files;
    }

    /**
     * List migrates.
     * @param environment Migration environment.
     * @returns List of found migrates, list of missing migrates, and list of okay migrates.
     */
    async listMigrates(environment: MinecraftEnvironment): Promise<{
        found: { [ Hash in string ]: string; };
        missing: { [ Hash in string ]: string; };
        okay: { [ Hash in string ]: string; };
    }> {
        // Loads environment
        const pack = await this.readPackJSON();
        const loaders = {
            [ MinecraftTypeEnum.DATAPACK ]: environment.datapackLoader,
            [ MinecraftTypeEnum.MOD ]: environment.custompackLoader,
            [ MinecraftTypeEnum.PLUGIN ]: environment.custompackLoader,
            [ MinecraftTypeEnum.RESOURCEPACK ]: environment.resourcepackLoader,
            [ MinecraftTypeEnum.SHADERPACK ]: environment.shaderpackLoader
        };
        
        // Lists migrates
        const found: { [ Hash in string ]: string; } = {};
        const okay: { [ Hash in string ]: string; } = {};
        const missing: { [ Hash in string ]: string; } = {};
        for(const hash in pack.addons) {
            const upstream = pack.addons[hash];
            if(MinecraftRegistry.satisfiesEnvironment(upstream, environment)) okay[hash] = upstream;
            else try {
                const { id } = MinecraftRegistry.loadUpstream(upstream);
                const type = MinecraftRegistry.inferUpstreamType(upstream, environment);
                found[hash] = await this.resolveQuery(`${id}@latest#${loaders[type]}=${environment.minecraft}`);
            }
            catch { missing[hash] = upstream; }
        }

        // Returns results
        return { found, okay, missing };
    }

    /**
     * List upgrades.
     * @returns List of found upgrades, list of ignored upgrades, list of missing upgrades, and list of okay upgrades.
     */
    async listUpgrades(): Promise<{
        found: { [ Hash in string ]: string; };
        ignored: { [ Hash in string ]: string; };
        missing: { [ Hash in string ]: string; };
        okay: { [ Hash in string ]: string; };
    }> {
        // Loads environment
        const pack = await this.readPackJSON();
        const loaders = {
            [ MinecraftTypeEnum.DATAPACK ]: pack.environment.datapackLoader,
            [ MinecraftTypeEnum.MOD ]: pack.environment.custompackLoader,
            [ MinecraftTypeEnum.PLUGIN ]: pack.environment.custompackLoader,
            [ MinecraftTypeEnum.RESOURCEPACK ]: pack.environment.resourcepackLoader,
            [ MinecraftTypeEnum.SHADERPACK ]: pack.environment.shaderpackLoader
        };
        
        // Lists upgrades
        const found: { [ Hash in string ]: string; } = {};
        const ignored: { [ Hash in string ]: string; } = {};
        const okay: { [ Hash in string ]: string; } = {};
        const missing: { [ Hash in string ]: string; } = {};
        for(const hash in pack.addons) {
            const upstream = pack.addons[hash];
            if(!MinecraftRegistry.satisfiesEnvironment(upstream, pack.environment)) ignored[hash] = upstream;
            else try {
                const { id } = MinecraftRegistry.loadUpstream(upstream);
                const type = MinecraftRegistry.inferUpstreamType(upstream, pack.environment);
                const upgrade = await this.resolveQuery(`${id}@latest#${loaders[type]}=${pack.environment.minecraft}`);
                if(upstream === upgrade) okay[hash] = upstream;
                else found[hash] = upgrade;
            }
            catch { missing[hash] = upstream; }
        }

        // Returns results
        return { found, ignored, okay, missing };
    }

    /**
     * Reads data from GSMC-Pack JSON file.
     * @returns GSMC-Pack JSON.
     */
    async readPackJSON(): Promise<PackJSON> {
        // Reads pack file
        try { return await Bun.file(resolvePath(this.path, "gsmc-pack.json")).json() as PackJSON; }

        // Returns default
        catch { return structuredClone(this.defaultPackJSON); }
    }

    /**
     * Relinks unlinked addons.
     * @param commit Whether to modify instance.
     */
    async *relinkUnlinked(commit: boolean = false) : AsyncGenerator<[ string, MinecraftAddon ], void, void> {
        // Relinks addons
        const { unlinked } = await this.listAddons();
        for(const addon of unlinked) yield addon.relinkUpstream(commit);
    }

    /**
     * Remove upstream string.
     * @param hash SHA-1 hash.
     * @param commit Whether to modify instance.
     * @returns Updated pack.
     */
    async removeUpstream(hash: string, commit: boolean = false): Promise<PackJSON> {
        // Removes upstream string
        const pack = await this.readPackJSON();
        if(hash in pack.addons) delete pack.addons[hash];
        else throw new Error("REMOVE_NO_ADDON");
        
        // Writes pack file
        if(commit) await this.writePackJSON(pack);

        // Returns pack
        return pack;
    }

    /**
     * Replaces upstream string.
     * @param hash SHA-1 hash.
     * @param upstream Upstream string.
     * @param commit Whether to modify instance.
     * @returns Updated pack.
     */
    async replaceUpstream(hash: string, upstream: string, commit: boolean = false): Promise<PackJSON> {
        // Replaces upstream string
        const pack = await this.readPackJSON();
        if(hash in pack.addons) pack.addons[hash] = upstream;
        else throw new Error("REPLACE_NO_ADDON");
        
        // Writes pack file
        if(commit) await this.writePackJSON(pack);

        // Returns pack
        return pack;
    }

    /**
     * Resolves upstream string from upstream query.
     * @param query Upstream query.
     * @returns Upstream string.
     */
    async resolveQuery(query: string): Promise<string> {
        // Parses query
        const match = query.match(/^(?:([^:@#=]+):)?([^:@#=]+)(?:@([^:@#=]+))?(?:#([^:@#=]+))?(?:=([^:@#=]+))?$/);
        if(match === null) throw new Error(error("RESOLVE_BAD_QUERY"));
        const [ _, registryType, lookup, tagOverride, loaderOverride, minecraftOverride ] = match;
        
        // Loads environment
        const pack = await this.readPackJSON();
        const environment: MinecraftEnvironment = {
            "datapackLoader": typeof loaderOverride === "undefined" ? pack.environment.datapackLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
            "minecraft": typeof minecraftOverride === "undefined" ? pack.environment.minecraft : minecraftOverride.toUpperCase(),
            "resourcepackLoader": typeof loaderOverride === "undefined" ? pack.environment.resourcepackLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
            "custompackLoader": typeof loaderOverride === "undefined" ? pack.environment.custompackLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
            "shaderpackLoader": typeof loaderOverride === "undefined" ? pack.environment.shaderpackLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
        };

        // Resolves query
        const registries = typeof registryType === "undefined" ? this.registries : this.registries.filter((registry) => registry.registry as string === registryType.toUpperCase());
        for(const registry of registries) {
            // Resolves latest
            if(typeof tagOverride === "undefined" || tagOverride === "latest") {
                // Resolves query by ID
                try {
                    const upstreams = await registry.fetchUpstreamsFromID(environment.minecraft, lookup);
                    const results = upstreams.filter((upstream) => MinecraftRegistry.satisfiesEnvironment(upstream, environment));
                    if(results.length > 0) return results[0];
                }
                catch {}

                // Resolves query by slug
                try {
                    const slug = await registry.fetchIDFromSlug(lookup);
                    const upstreams = await registry.fetchUpstreamsFromID(environment.minecraft, slug);
                    const results = upstreams.filter((upstream) => MinecraftRegistry.satisfiesEnvironment(upstream, environment));
                    if(results.length > 0) return results[0];
                }
                catch {}
            }

            // Resolves specific
            else {
                // Resolves query by ID
                try {
                    const upstream = await registry.fetchUpstreamFromTag(lookup, tagOverride);
                    if(MinecraftRegistry.satisfiesEnvironment(upstream, environment)) return upstream;
                }
                catch {}

                // Resolves query by slug
                try {
                    const slug = await registry.fetchIDFromSlug(lookup);
                    const upstream = await registry.fetchUpstreamFromTag(slug, tagOverride);
                    if(MinecraftRegistry.satisfiesEnvironment(upstream, environment)) return upstream;
                }
                catch {}
            }
        }
        
        // Throws error
        throw new Error(error("RESOLVE_NO_UPSTREAM"));
    }

    /**
     * Writes data to GSMC-Pack JSON file.
     * @param pack GSMC-Pack JSON.
     */
    async writePackJSON(pack: PackJSON): Promise<void> {
        // Writes pack file
        await Bun.file(resolvePath(this.path, "gsmc-pack.json")).write(JSON.stringify(pack, null, 4));
    }
}
