// Imports
import { resolve as resolvePath } from "node:path";
import { homedir as getHomeDirectory } from "node:os";

/**
 * Reads the CurseForge API key from the '~/.gsmc-pack/curse-forge.key' file.
 * @returns 
 */
export async function readCurseForgeAPIKey(): Promise<string> {
    try {
        // Reads '~/.gsmc-pack/curse-forge.key' if exists
        return await Bun.file(resolvePath(getHomeDirectory(), "./.gsmc-pack/curse-forge.key")).text();
    }
    catch {
        // Returns empty string as fallback
        return "";
    }
}
