// Imports
import { readdir as readDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "./minecraft-addon";
import { MinecraftLoaderEnum, MinecraftRegistry, MinecraftTypeEnum } from "./minecraft-registry";
import { MinecraftDatapack } from "./addon/minecraft-datapack";
import { MinecraftMod } from "./addon/minecraft-mod";
import { MinecraftPlugin } from "./addon/minecraft-plugin";
import { MinecraftResourcepack } from "./addon/minecraft-resourcepack";
import { MinecraftShaderpack } from "./addon/minecraft-shaderpack";
import { MinecraftUnknown } from "./addon/minecraft-unknown";
import { CurseForgeRegistry } from "./registry/curseforge-registry";
import { ModrinthRegistry } from "./registry/modrinth-registry";

/** GSMC-Pack JSON file. */
export interface PackJSON {
    /** List of addons. */
    addons: { [ Hash in string ]: string; };
    /** Authors of this pack. */
    authors: string[];
    /** Description about this pack. */
    description: string;
    /** Preferred environment of this pack. */
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
    /** Name of this pack. */
    name: string;
    /** Version of this pack. */
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
    /** Supported addon registries in GSMC-Pack. */
    readonly registries: MinecraftRegistry[] = [
        new ModrinthRegistry(),
        new CurseForgeRegistry()
    ];

    /** Path to instance. */
    readonly path: string;

    /**
     * Creates new Minecraft instance.
     * @param path Path to instance.
     */
    constructor(path: string) {
        // Inits fields
        this.path = path;
    }

    /**
     * Creates addon by upstream.
     * @param file Source file of addon.
     * @param upstream Upstream string of addon.
     * @returns Created addon.
     */
    createMinecraftAddon(file: Bun.BunFile | null, upstream: string): MinecraftAddon {
        // Infers addon
        switch(MinecraftRegistry.inferBestUpstreamType(upstream)) {
            case MinecraftTypeEnum.DATAPACK: return new MinecraftDatapack(this, file, upstream);
            case MinecraftTypeEnum.MOD: return new MinecraftMod(this, file, upstream);
            case MinecraftTypeEnum.PLUGIN: return new MinecraftPlugin(this, file, upstream);
            case MinecraftTypeEnum.RESOURCEPACK: return new MinecraftResourcepack(this, file, upstream);
            case MinecraftTypeEnum.SHADERPACK: return new MinecraftShaderpack(this, file, upstream);
            case MinecraftTypeEnum.UNKNOWN: return new MinecraftUnknown(this, file, upstream);
        }
    }

    /**
     * Downloads all missing addons.
     */
    async *downloadMissingAddons(): AsyncGenerator<MinecraftAddon, void, void> {
        // Downloads addons
        const { missing } = await this.listLocalAddons();
        for(const addon of missing) yield addon.downloadFileFromUpstream();
    }

    /**
     * Gets list of local addons.
     * @returns List of linked addons, list of unlinked addons, and list of missing addons.
     */
    async listLocalAddons(): Promise<{ linked: MinecraftAddon[]; missing: MinecraftAddon[]; unlinked: MinecraftUnknown[]; }> {
        // Lists local addons
        const pack = await this.readPackJSON();
        const files = await this.listLocalFiles();
        const hashes = new Set(Object.keys(pack.addons));
        const linked: MinecraftAddon[] = [];
        const unlinked: MinecraftUnknown[] = [];
        for(const file of files) {
            const hash = Bun.CryptoHasher.hash("sha1", await file.arrayBuffer()).toHex();
            if(hashes.delete(hash) || hash in pack.addons) linked.push(this.createMinecraftAddon(file, pack.addons[hash]));
            else unlinked.push(new MinecraftUnknown(this, file, null));
        }
        const missing = Array.from(hashes).map((hash) => this.createMinecraftAddon(null, pack.addons[hash]));        
        
        // Returns results
        return { linked, missing, unlinked };
    }

    /**
     * Gets list of local addon files.
     * @returns List of files.
     */
    async listLocalFiles(): Promise<Bun.BunFile[]> {
        // Creates files
        const files: Bun.BunFile[] = [];

        // Includes datapack files
        try {
            const datapacks = await readDirectory(resolvePath(this.path, "data"));
            for(const datapack of datapacks) {
                const file = Bun.file(resolvePath(this.path, "data", datapack));
                if(file.type === "application/zip") files.push(file);
            }
        }
        catch {}

        // Includes mod files
        try {
            const mods = await readDirectory(resolvePath(this.path, "mods"));
            for(const mod of mods) {
                const file = Bun.file(resolvePath(this.path, "mods", mod));
                if(file.type === "application/java-archive") files.push(file);
            }
        }
        catch {}

        // Includes plugin files
        try {
            const plugins = await readDirectory(resolvePath(this.path, "plugins"));
            for(const plugin of plugins) {
                const file = Bun.file(resolvePath(this.path, "plugins", plugin));
                if(file.type === "application/java-archive") files.push(file);
            }
        }
        catch {}

        // Includes resourcepack files
        try {
            const resourcepacks = await readDirectory(resolvePath(this.path, "resourcepacks"));
            for(const resourcepack of resourcepacks) {
                const file = Bun.file(resolvePath(this.path, "resourcepacks", resourcepack));
                if(file.type === "application/zip") files.push(file);
            }
        }
        catch {}

        // Includes shaderpack files
        try {
            const shaderpacks = await readDirectory(resolvePath(this.path, "shaderpacks"));
            for(const shaderpack of shaderpacks) {
                const file = Bun.file(resolvePath(this.path, "shaderpacks", shaderpack));
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
     * Relinks all unlinked addons.
     */
    async *relinkUnlinkedFiles() : AsyncGenerator<string, void, void> {
        // Relinks addons
        const { unlinked } = await this.listLocalAddons();
        for(const addon of unlinked) yield addon.relinkUpstreamFromSource();
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
