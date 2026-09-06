// Imports
import errors from "./errors.json";

/**
 * Formats a template error message with dynamic values.
 * @param code The error code. See `errors.json` for a list of available error codes.
 * @param values An object of dynamic values. For example, `{ "key": "value" }` will replace all instances of `"$key"` with `"value"`.
 * @returns A formatted error message.
 */
export function _error(code: keyof typeof errors, values: { [ value in string ]: string } = {}): string {
    // Generates error message
    const message = errors[code] ?? `This is a fallback error message. The error code '${code}' does not exist.`;
    return message.replaceAll(/\$(\w+)/g, (match, value) => value in values ? values[value] : match);
}
