// Imports libraries
import { resolve as resolvePath } from "node:path";
import { homedir as getHomeDirectory } from "node:os";

/**
 * Reads CurseForge API key from '~/.gsmc-pack/curse-forge.key' file.
 * @returns CurseForge API key.
 */
export async function readCurseForgeAPIKey(): Promise<string> {
    try {
        // Reads key
        return await Bun.file(resolvePath(getHomeDirectory(), "./.gsmc-pack/curse-forge.key")).text();
    }
    catch {
        // Returns empty
        return "";
    }
}
