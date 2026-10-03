// Imports
import { homedir as getHomeDirectory } from "node:os";
import { resolve as resolvePath } from "node:path";

/**
 * Reads CurseForge API key from '~/.gsmc-pack/curse-forge.key' file.
 * @returns CurseForge API key.
 */
export async function readCurseForgeAPIKey(): Promise<string> {
    // Reads key
    try { return await Bun.file(resolvePath(getHomeDirectory(), "./.gsmc-pack/curse-forge.key")).text(); }
    catch { return ""; }
}
