// Imports
import nodePath from "node:path";
import { err } from "../../pretty";

// Defines constants
export const fsync = process.env.FSYNC === "1"; 
export const packd = nodePath.resolve(import.meta.dir, "../../", process.env.PACKF ?? "pack/");
export const packf = nodePath.resolve(import.meta.dir, "../../", process.env.PACKF ?? "pack.jsonc");

// Defines helpers
export function attempt<Type>(tasks: (() => Type)[]): Type[] {
    // Attempts tasks
    const results: Type[] = [];
    for(let i = 0; i < tasks.length; i++) {
        try {
            results.push(tasks[i]());
        }
        catch(error) {
            err(error instanceof Error ? error.message : String(error));
        }
    }
    return results;
}
export async function resolve<Type>(promises: Promise<Type>[]): Promise<Type[]> {
    // Resolves promises
    const results: Type[] = [];
    await Promise.all(
        promises.map(
            (promise) => promise
                .then((result) => results.push(result))
                .catch((error) => err(error instanceof Error ? error.message : String(error)))
        )
    );
    return results;
}
