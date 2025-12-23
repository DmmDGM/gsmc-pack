// Imports
import nodeCrypto from "node:crypto";
import nodeFile from "node:fs/promises";
import nodePath from "node:path";
import chalk from "chalk";

// Defines errors
export class MalformedOriginError extends Error {}
export class ModrinthTimeoutError extends Error {}
export class NoPackJsoncError extends Error {}

// Defines constants
export const packf = process.env.PACKF ?? "pack.jsonc";
export const packd = process.env.PACKD ?? "pack/";

// Defines types
export interface ModrinthEntry {
    as: string;
    avoids: string[];
    date: number;
    hash: string;
    label: string;
    needs: string[];
    platforms: string[];
    project: string;
    revision: string;
    size: number;
    url: string;
    versions: string[];
    wants: string[];
}

// Defines modrinth api
export async function modrinthFetch(url: string): Promise<Response> {
    // Fetches modrinth
    for(let i = 0; i < 5; i++) {
        // Creates response
        const response = await fetch(url, {
            headers: {
                "user-agent": "DmmDGM/gsmc-pack/1.0.0"
            }
        });

        // Checks ratelimit
        const ratelimit = +response.headers.get("x-ratelimit-remaining")!;
        if(ratelimit === 0) {
            const timeout = +response.headers.get("x-ratelimit-reset")!;
            await Bun.sleep(timeout * 1000 + 1000);
            continue;
        }
        
        // Returns response
        return response;
    }
    throw new ModrinthTimeoutError(url);
}
export async function modrinthSearch(label: string, platforms: string[], versions: string[]): Promise<ModrinthEntry[]> {
    // Creates url
    const url = new URL(`https://api.modrinth.com/v2/project/${label}/version`);
    if(platforms.length > 0) url.searchParams.append("loaders", JSON.stringify(platforms));
    if(versions.length > 0) url.searchParams.append("game_versions", JSON.stringify(versions));

    // Creates response
    const response = await modrinthFetch(url.toString());
    if(!response.ok) return [];
    
    // Creates entries response
    const json = await response.json() as {
        date_published: string;
        dependencies: {
            dependency_type: string;
            project_id: string;
        }[];
        files: {
            hashes: { sha512: string; };
            filename: string;
            primary: boolean;
            size: number;
            url: string;
        }[];
        game_versions: string[];
        id: string;
        loaders: string[];
        project_id: string;
    }[];
    return json
        .filter((data) => data.files.length > 0)
        .map((data) => {
            const file = data.files.find((file) => file.primary) ?? data.files[0];
            return {
                as: file.filename,
                avoids: data.dependencies
                    .filter((dependency) => dependency.dependency_type === "incompatible")
                    .map((dependency) => dependency.project_id),
                date: +new Date(data.date_published),
                hash: file.hashes.sha512,
                label: label,
                needs: data.dependencies
                    .filter((dependency) => dependency.dependency_type === "required")
                    .map((dependency) => dependency.project_id),
                platforms: data.loaders,
                project: data.project_id,
                revision: data.id,
                size: file.size,
                url: file.url,
                versions: data.game_versions,
                wants: data.dependencies
                    .filter((dependency) => dependency.dependency_type === "optional")
                    .map((dependency) => dependency.project_id)
            };
        })
        .sort((a, b) => b.date - a.date);
}
export async function modrinthLookup(project: string): Promise<string | null> {
    // Creates url
    const url = new URL(`https://api.modrinth.com/v2/project/${project}`);

    // Creates response
    const response = await modrinthFetch(url.toString());
    if(!response.ok) return null;

    // Fetches slug
    const json = await response.json() as {
        slug: string;
    };
    return json.slug;
}

// Defines generic api
export async function clean(): Promise<boolean> {
    // Cleans pack directory
    try {
        const path = nodePath.resolve(import.meta.dir, "../", packd);
        await nodeFile.rm(path, { recursive: true });
        return true;
    }
    catch {
        return false;
    }
}
export async function download(destination: string, url: string): Promise<boolean> {
    // Creates respones
    const response = await fetch(url);
    if(!response.ok) return false;

    // Writes blob
    const blob = await response.blob();
    const path = nodePath.resolve(import.meta.dir, "../", packd, destination);
    try {
        await Bun.write(path, blob);
        return true;
    }
    catch {
        return false;
    }
}
export async function kill(destination: string): Promise<boolean> {
    // Kills file
    try {
        const path = nodePath.resolve(import.meta.dir, "../", packd, destination);
        const file = Bun.file(path);
        await file.delete();
        return true;
    }
    catch {
        return false;
    }
}
export async function run(callback: () => void | Promise<void>): Promise<void> {
    try {
        await callback();
    }
    catch(error) {
        // Handles errors
        if(error instanceof MalformedOriginError)
            printError("Origin is malformed or unparsable.", error.message)
        else if(error instanceof NoPackJsoncError)
            printError("Unable to read pack.jsonc.", error.message);
        else if(error instanceof Error)
            printError("Error occurred.", error.message);
        else
            printError("Error occurred", String(error));
    }
}
export async function source(): Promise<string[]> {
    // Parses origins
    try {
        const path = nodePath.resolve(import.meta.dir, "../", packf);
        const result = await import(path) as { default: string[]; };
        return Object.assign([], result.default);
    }
    catch {
        throw new NoPackJsoncError(packf);
    }
}
export async function validate(destination: string, hash: string): Promise<boolean> {
    // Checks hash
    const path = nodePath.resolve(import.meta.dir, "../", packd, destination);
    const buffer = Buffer.from(await Bun.file(path).arrayBuffer());
    const file = nodeCrypto.createHash("sha512").update(buffer).digest("hex");
    return file === hash;
}

// Defines pretty api
export function glow(text: string): string {
    // Styles text
    return chalk.magenta(text);
}
export function printAlert(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.rgb(0, 127, 191)(`${tab}[%] ${message}`));
}
export function printBad(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.rgb(223, 0, 63)(`${tab}[✗] ${message}`));
}
export function printError(message: string, trace: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.redBright(`${tab}[!] ${message} (${chalk.blue(trace)})`));
}
export function printFail(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.red(`${tab}[-] ${message}`));
}
export function printGood(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.rgb(0, 223, 63)(`${tab}[✓] ${message}`));
}
export function printNote(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.gray(`${tab}[#] ${message}`));
}
export function printPass(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.green(`${tab}[+] ${message}`));
}
export function printWarn(message: string, trace: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.yellowBright(`${tab}[?] ${message} (${chalk.blue(trace)})`));
}
export function printYell(message: string, indent: number = 0): void {
    // Prints message
    const tab = "    ".repeat(indent);
    console.log(chalk.cyan(`${tab}[@] ${message}`));
}

