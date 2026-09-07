// Imports
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

/**
 * Formats a template error message with dynamic values.
 * @param code The error code. See `errors.json` for a list of available error codes.
 * @param values An object of dynamic values. For example, `{ "key": "value" }` will replace all instances of `"$key"` with `"value"`.
 * @returns A formatted error message.
 */
export function _error(code: keyof typeof errors, values: { [ Value in string ]: string } = {}): string {
    // Generates error message
    const message = errors[code] ?? `This is a fallback error message. The error code '${code}' does not exist.`;
    return message.replaceAll(/\$(\w+)/g, (match, value) => value in values ? values[value] : match);
}
