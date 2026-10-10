/**
 * Wraps text with indents.
 * @param text Original text.
 * @param width Width of text.
 * @param indents Number of indents.
 * @returns Wrapped text.
 */
export function wrapWithIndent(text: string, indents: number = 0, width: number = Infinity): string {
    // Wraps text
    const wrapped = Bun.wrapAnsi(text, Math.min(process.stdout.columns - indents * 2, width), { hard: true, trim: false, wordWrap: true });
    return wrapped.split("\n").map((line) => " ".repeat(indents * 2) + line).join("\n");
}
