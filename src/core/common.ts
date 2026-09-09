// Imports
import nodeOs from "node:os";
import nodePath from "node:path";
import errors from "./errors.json";

/** A list of supported Minecraft addon types in gsmc-pack. */
export enum MinecraftAddonType {
    DATA = "DATA",
    MOD = "MOD",
    PLUGIN = "PLUGIN",
    RESOURCE = "RESOURCE",
    SHADER = "SHADER"
}

/** A list of supported Minecraft mod flavors in gsmc-pack. */
export enum MinecraftModFlavor {
    FABRIC = "FABRIC",
    FORGE = "FORGE",
    NEO_FORGE = "NEO_FORGE"
}

/** A list of supported Minecraft registry types in gsmc-pack. */
export enum MinecraftRegistryType {
    CURSE_FORGE = "CURSE_FORGE",
    MODRINTH = "MODRINTH"
}

/** A representation of the 'gsmc-pack.json' interface. */
export interface GSMCPackJSON {
    addons: { [ Hash in string ]: MinecraftAddon };
    description: string;
    environment: MinecraftEnvironment;
    name: string;
    schema: number;
}

/** A representation of the Minecraft addon interface. */
export interface MinecraftAddon {
    flavor: MinecraftModFlavor;
    id: string;
    name: string;
    type: MinecraftAddonType;
    upstream: string;
    version: string;
}

/** A representation of the Minecraft environment interface. */
export interface MinecraftEnvironment {
    mod: MinecraftModFlavor | null;
    plugin: null;
    shader: null;
    version: string;
}

/** A representation of the Minecraft upstream interface. */
export interface MinecraftUpstream {
    date: number;
    file: string;
    hash: string;
    id: string;
    url: string;
    version: string;
}

/**
 * Formats a template error message with dynamic values.
 * @param code The error code. See `errors.json` for a list of available error codes.
 * @param values An object of dynamic values. For example, `{ "key": "value" }` will replace all instances of `"$key"` with `"value"`.
 * @returns A formatted error message.
 */
export function format(code: keyof typeof errors, values: { [ Value in string ]: string } = {}): string {
    // Generates error message
    const message = errors[code] ?? `This is a fallback error message. The error code '${code}' does not exist.`;
    return message.replaceAll(/\$(\w+)/g, (match, value) => value in values ? values[value] : match);
}

/**
 * Reads the CurseForge API key from the '~/.gsmc-pack/curse-forge.key' file.
 * @returns 
 */
export async function readCurseForgeAPIKey(): Promise<string> {
    try {
        // Reads '~/.gsmc-pack/curse-forge.key' if exists
        return await Bun.file(nodePath.resolve(nodeOs.homedir(), "./.gsmc-pack/curse-forge.key")).text();
    }
    catch {
        // Returns empty string as fallback
        return "";
    }
}
