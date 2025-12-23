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
    date: number;
    hash: string;
    label: string;
    platforms: string[];
    project: string;
    revision: string;
    size: number;
    url: string;
    versions: string[];
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
    const projects = await response.json() as {
        date_published: string;
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
        name: string;
    }[];
    return projects
        .filter((project) => project.files.length > 0)
        .map((project) => {
            const file = project.files.find((file) => file.primary) ?? project.files[0];
            return {
                as: file.filename,
                date: +new Date(project.date_published),
                hash: file.hashes.sha512,
                label: label,
                platforms: project.loaders,
                project: project.name,
                revision: project.id,
                size: file.size,
                url: file.url,
                versions: project.game_versions
            };
        })
        .sort((a, b) => b.date - a.date);
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
export function printError(message: string, trace: string): void {
    // Prints message
    console.log(chalk.redBright(`[!] ${message} (${chalk.blue(trace)})`));
}
export function printWarn(message: string, trace: string): void {
    // Prints message
    console.log(chalk.yellowBright(`[?] ${message} (${chalk.blue(trace)})`));
}
export function printFail(message: string): void {
    // Prints message
    console.log(chalk.red(`[-] ${message}`));
}
export function printPass(message: string): void {
    // Prints message
    console.log(chalk.green(`[+] ${message}`));
}
export function printNote(message: string): void {
    // Prints message
    console.log(chalk.gray(`[#] ${message}`));
}
export function printYell(message: string): void {
    // Prints message
    console.log(chalk.cyan(`[@] ${message}`));
}
