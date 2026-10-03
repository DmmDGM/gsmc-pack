// Imports
import type { MinecraftDownload } from "./minecraft-download";
import { readdir as readDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { cwd as getCurrentDirectory } from "node:process";
import { CurseForgeRegistry } from "./curseforge-registry";
import { MinecraftAddon } from "./minecraft-addon";
import { MinecraftEnvironment, MinecraftLoaderEnum, MinecraftRegistry, MinecraftTypeEnum } from "./minecraft-registry";
import { ModrinthRegistry } from "./modrinth-registry";
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
            modLoader: MinecraftLoaderEnum.FABRIC,
            pluginLoader: MinecraftLoaderEnum.PAPER,
            resourcepackLoader: MinecraftLoaderEnum.MINECRAFT,
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

    async addAddon(upstream: string, commit: boolean = false): Promise<MinecraftAddon> {

    }

    async removeAddon(hash: string, commit: boolean = false): Promise<MinecraftAddon> {

    }

    async updateAddon(hash: string, upstream: string, commit: boolean = false): Promise<MinecraftAddon> {

    }

    async *migrateEnvironment(environment: PackJSON["environment"], commit: boolean = false): AsyncGenerator<MinecraftAddon, void, void> {

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
     * Lists addons in instance..
     * @returns List of linked addons, list of unlinked addons, and list of missing addons.
     */
    async listAddons(): Promise<{ linked: MinecraftAddon[]; missing: MinecraftAddon[]; unlinked: MinecraftAddon[]; }> {
        // Lists local addons
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
     * Lists files in instance.
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
            "modLoader": typeof loaderOverride === "undefined" ? pack.environment.modLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
            "pluginLoader": typeof loaderOverride === "undefined" ? pack.environment.pluginLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
            "resourcepackLoader": typeof loaderOverride === "undefined" ? pack.environment.resourcepackLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
            "shaderpackLoader": typeof loaderOverride === "undefined" ? pack.environment.shaderpackLoader : loaderOverride.toUpperCase() as MinecraftLoaderEnum,
        };

        // Resolves query
        const registries = typeof registryType === "undefined" ? this.registries : this.registries.filter((registry) => registry.type as string === registryType.toUpperCase());
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
