// Imports
import type { MinecraftDownload } from "./minecraft-download";
import { readdir as readDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { cwd as getCurrentDirectory } from "node:process";
import { CurseForgeRegistry } from "./curseforge-registry";
import { MinecraftAddon } from "./minecraft-addon";
import { MinecraftLoaderEnum, MinecraftRegistry } from "./minecraft-registry";
import { ModrinthRegistry } from "./modrinth-registry";

/** GSMC-Pack JSON file. */
export interface PackJSON {
    /** Pack addons. */
    addons: { [ Hash in string ]: string; };
    /** Pack authors. */
    authors: string[];
    /** Pack description. */
    description: string;
    /** Preferred environment. */
    environment: {
        /** Preferred datapack loader. */
        datapackLoader: MinecraftLoaderEnum;
        /** Preferred Minecraft version. */
        minecraft: string;
        /** Preferred mod loader. */
        modLoader: MinecraftLoaderEnum;
        /** Preferred plugin loader. */
        pluginLoader: MinecraftLoaderEnum;
        /** Preferred resourcepack loader. */
        resourcepackLoader: MinecraftLoaderEnum;
        /** Preferred shaderpack loader. */
        shaderpackLoader: MinecraftLoaderEnum;
    };
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

    async resolveQuery(query: string): Promise<string[]> {
        "modrinth:fabric-api@latest#fabric=1.21.5"
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
