// Imports resources
import errors from "./errors.json";

/**
 * Formats error with dynamic values.
 * @param code Error code. See `errors.json` for a list of available error codes.
 * @param values Dynamic values. e.g. `{ "key": "value" }` will replace all instances of `"$key"` with `"value"`.
 * @returns Formatted error message.
 */
export function error(code: keyof typeof errors, values: { [ Value in string ]: unknown } = {}): string {
    // Generates error message
    const message = errors[code] ?? `This is a fallback error message. Error code '${code}' does not exist.`;
    return message.replaceAll(/\$(\w+)/g, (match, value) => value in values ? String(values[value]) : match);
}
