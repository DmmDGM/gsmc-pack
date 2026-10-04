/**
 * Wraps text with indents.
 * @param text Original text.
 * @param width Width of text.
 * @param indents Number of indents.
 * @returns Wrapped text.
 */
export function wrapWithIndent(text: string, width: number, indents: number): string {
    // Wraps text
    const wrapped = Bun.wrapAnsi(text, width - indents * 8, { wordWrap: true });
    return wrapped.split("\n").map((line) => " ".repeat(indents * 8) + line).join("\n");
}
