// Imports
import nodeAssert from "node:assert";
import {
    mkdtemp as makeTemporaryDirectory,
    readdir as readDirectory,
    copyFile
} from "node:fs/promises";
import { tmpdir as getTemporaryDirectory } from "node:os";
import { resolve as resolvePath } from "node:path";
import { MinecraftAddon } from "./addon";
import { MinecraftMod } from "./mod";
import { format } from "../core/errors";
import { MinecraftAddonFlavor } from "../core/flavor";
import { GSMCPack } from "../core/gsmcpack";
import { MinecraftAddonType } from "../core/type";
import { MinecraftAddonUpstream } from "../core/upstream";
import { sniffMinecraftAddonType } from "../core/sniff";
import { MinecraftAddonRegistry } from "../core/registries";
import { CurseForgeRegistry } from "../registry/curseforge";
import { ModrinthRegistry } from "../registry/modrinth";

/** Represents a Minecraft instance. */
export class MinecraftInstance {
    /** The path to this instance. */
    readonly path: string;

    /**
     * Creates a new Minecraft instance instance.
     * @param path The path to this instance.
     */
    constructor(path: string) {    
        // Initializes instance
        this.path = path;
    }

    /**
     * Adds an addon by its upstream to the 'gsmc-pack.json' file in this instance.
     * @param upstream The upstream of the addon.
     * @returns A new instance of the added addon.
     */
    async addAddon(upstream: MinecraftAddonUpstream): Promise<MinecraftAddon> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readPackFile();

        // Downloads addon file to temporary directory
        const temporaryDirectory = await makeTemporaryDirectory(resolvePath(getTemporaryDirectory(), "gsmc-pack-"));
        const temporaryPath = resolvePath(temporaryDirectory, upstream.file);
        await Bun.write(temporaryPath, await fetch(upstream.url));
        
        // Sniffs addon type
        switch(await sniffMinecraftAddonType(temporaryPath)) {
            case MinecraftAddonType.MOD: {
                // Moves addon file to mods directory
                const permanentPath = resolvePath(this.path, "mods", upstream.file);
                await copyFile(temporaryPath, permanentPath);

                // Rebuilds addon metadata
                const mod = new MinecraftMod(this, permanentPath, null, null);
                const rebuilt = await mod.rebuildMetadataFromSourceFile();
                pack.addons[rebuilt.hash!] = rebuilt.metadata!;

                // Writes 'gsmc-pack.json' file
                await this.writePackFile(pack);

                // Returns addon
                return rebuilt;
            }
            case MinecraftAddonType.DATA_PACK:
            case MinecraftAddonType.PLUGIN:
            case MinecraftAddonType.RESOURCE_PACK:
            case MinecraftAddonType.SHADER_PACK:
            case MinecraftAddonType.TEXTURE_PACK: {
                // Throws temporary error
                throw new Error("haiii not implemented yet kthxbai");
            }
        }        
    }

    /**
     * Gets an addon upstream from a given registry by its upstream major and minor.
     * @param registry The upstream registry of the addon.
     * @param major The upstream major of the addon.
     * @param minor The upstream minor of the addon.
     * @returns The upstream of the addon.
     */
    async getUpstream(registry: MinecraftAddonRegistry, major: string, minor: string | null = null): Promise<MinecraftAddonUpstream> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readPackFile();

        // Gets upstream from registry
        switch(registry) {
            case MinecraftAddonRegistry.CURSE_FORGE: {
                const upstreams = await CurseForgeRegistry.fetchMinorUpstreamsFromMajor(major, MinecraftAddonFlavor.UNKNOWN, pack.minecraft);
                if(minor !== null) {
                    const exact = upstreams.find((upstream) => upstream.minor === minor);
                    nodeAssert(exact, format("INSTANCE:GET_NO_SUCH_UPSTREAM_MINOR_CURSE_FORGE", { major, minor }));
                    return exact;
                }
                return upstreams.sort((a, b) => b.date - a.date)[0];
            }
            case MinecraftAddonRegistry.MODRINTH: {
                const upstreams = await ModrinthRegistry.fetchMinorUpstreamsFromMajor(major, MinecraftAddonFlavor.UNKNOWN, pack.minecraft);
                if(minor !== null) {
                    const exact = upstreams.find((upstream) => upstream.minor === minor);
                    nodeAssert(exact, format("INSTANCE:GET_NO_SUCH_UPSTREAM_MINOR_MODRINTH", { major, minor }));
                    return exact;
                }
                return upstreams.sort((a, b) => b.date - a.date)[0];
            }
        }
    }

    /**
     * Creates a new 'gsmc-pack.json' file in this instance.
     */
    async initPackFile(): Promise<void> {
        // Creates blank 'gsmc-pack.json' file
        const pack: GSMCPack = {
            addons: {},
            authors: [],
            description: "A list of my Minecraft addons for my world!",
            environment: {
                [ MinecraftAddonType.DATA_PACK ]: MinecraftAddonFlavor.UNKNOWN,
                [ MinecraftAddonType.MOD ]: MinecraftAddonFlavor.UNKNOWN,
                [ MinecraftAddonType.PLUGIN ]: MinecraftAddonFlavor.UNKNOWN,
                [ MinecraftAddonType.RESOURCE_PACK ]: MinecraftAddonFlavor.UNKNOWN,
                [ MinecraftAddonType.SHADER_PACK ]: MinecraftAddonFlavor.UNKNOWN,
                [ MinecraftAddonType.TEXTURE_PACK ]: MinecraftAddonFlavor.UNKNOWN,
            },
            minecraft: "26.2",
            name: "My GSMC Pack",
            schema: 1,
            server: false,
            version: "1.0.0"
        };

        // Writes 'gsmc-pack.json' file
        await this.writePackFile(pack);
    }

    /**
     * Installs all addons listed in the 'gsmc-pack.json' file in this instance.
     * @returns An array of successful installs and an array of failed installs.
     */
    async installAddons(): Promise<[ MinecraftAddon[], MinecraftAddon[] ]> {
        // Lists addons
        const addons = await this.listAddons();
        const successes: MinecraftAddon[] = [];
        const failures: MinecraftAddon[] = [];

        // Installs addons
        for(const addon of addons) {
            try {
                const upstream = addon.parseUpstreamFromMetadata();
                await Bun.write(addon.path, await fetch(upstream.url));
                successes.push(addon);
            }
            catch {
                failures.push(addon);
            }
        }

        // Returns results
        return [ successes, failures ];
    }

    /**
     * Lists the addons in this instance according to its 'gsmc-pack.json' file.
     * @returns An array of the addons in this instance.
     */
    async listAddons(): Promise<MinecraftAddon[]> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readPackFile();

        // Lists addons
        const addons: MinecraftAddon[] = [];
        for(const hash in pack.addons) {
            const metadata = pack.addons[hash];
            switch(metadata.type) {
                case MinecraftAddonType.MOD: {
                    addons.push(new MinecraftMod(this, resolvePath(this.path, metadata.path), hash, metadata));
                    break;
                }
            }
        }

        // Returns addons
        return addons;
    }

    /**
     * Reads data from the 'gsmc-pack.json' file in this instance.
     * @returns This instance's data from its 'gsmc-pack.json' file. 
     */
    async readPackFile(): Promise<GSMCPack> {
        // Reads 'gsmc-pack.json' file
        return await Bun.file(resolvePath(this.path, "gsmc-pack.json")).json();
    }

    /**
     * Rebuilds the 'addons' field of the 'gsmc-pack.json' file in this instance.
     * @returns An array of successful rebuilds and an array of failed rebuilds.
     */
    async rebuildAddons(): Promise<[ MinecraftAddon[], MinecraftAddon[] ]> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readPackFile();
        const successes: MinecraftAddon[] = [];
        const failures: MinecraftAddon[] = [];
        pack.addons = {};

        // Rebuilds mods
        try {
            const files = await readDirectory(resolvePath(this.path, "mods"));
            const mods = files.map((file) => new MinecraftMod(this, resolvePath(this.path, "mods", file), null, null));
            for(const mod of mods) {
                try {
                    const rebuilt = await mod.rebuildMetadataFromSourceFile();
                    pack.addons[rebuilt.hash!] = rebuilt.metadata!;
                    successes.push(rebuilt);
                }
                catch {
                    failures.push(mod);
                }
            }
        }
        catch {}
        
        // Writes 'gsmc-pack.json' file
        await this.writePackFile(pack);

        // Returns results
        return [ successes, failures ];
    }

    /**
     * Removes an addon by its hash from the 'gsmc-pack.json' file in this instance.
     * @param hash The hash of the addon.
     */
    async removeAddon(hash: string): Promise<void> {
        // Reads 'gsmc-pack.json' file
        const pack = await this.readPackFile();

        // Ignores empty remove
        if(!(hash in pack.addons)) return;

        // Delete addon file
        const addon = pack.addons[hash];
        await Bun.file(resolvePath(this.path, addon.path)).delete();

        // Delete addon entry
        delete pack.addons[hash];

        // Writes 'gsmc-pack.json' file
        await this.writePackFile(pack);
    }

    /**
     * Replaces one addon to another in this instance.
     * @param hash The hash of the original addon.
     * @param upstream The upstream of the new addon.
     * @returns An instance of the new addon.
     */
    async replaceAddon(hash: string, upstream: MinecraftAddonUpstream): Promise<MinecraftAddon> {
        // Replaces addon
        await this.removeAddon(hash);
        return await this.addAddon(upstream);
    }

    /**
     * Updates addons according the 'gsmc-pack.json' file in this instance to the latest versions.
     * @returns An array of successful updates, an array of failed updates, and an array of skipped updates.
     */
    async updateAddons(): Promise<[ MinecraftAddon[], MinecraftAddon[], MinecraftAddon[] ]> {
        // Lists addons
        const addons = await this.listAddons();
        const successes: MinecraftAddon[] = [];
        const failures: MinecraftAddon[] = [];
        const passes: MinecraftAddon[] = [];

        // Updates addons
        for(const addon of addons) {
            try {
                const upstream = await addon.checkUpdatableUpstream();
                if(upstream === null) {
                    passes.push(addon);
                    continue;
                }
                await this.replaceAddon(addon.hash!, upstream);
                successes.push(addon);
            }
            catch(err) {
                console.log(err)
                failures.push(addon);
            }
        }

        // Returns results
        return [ successes, failures, passes ];
    }

    /**
     * Writes data to the 'gsmc-pack.json' file in this instance.
     * @param pack The data for the 'gsmc-pack.json' file.
     */
    async writePackFile(pack: GSMCPack): Promise<void> {
        // Writes 'gsmc-pack.json' file
        await Bun.file(resolvePath(this.path, "gsmc-pack.json")).write(JSON.stringify(pack, null, 4));
    }
}
