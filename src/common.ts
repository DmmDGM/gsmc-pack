// Imports
import nodePath from "node:path";
import { err } from "./pretty";

// Defines constants
export const fsync = process.env.FSYNC === "1"; 
export const packd = nodePath.resolve(import.meta.dir, "../", process.env.PACKF ?? "pack/");
export const packf = nodePath.resolve(import.meta.dir, "../", process.env.PACKF ?? "pack.jsonc");

// Defines helpers
export async function resolve<Type>(promises: Promise<Type>[]): Promise<Type[]> {
    // Resolves promises
    const results: Type[] = [];
    await Promise.all(
        promises.map(
            (promise) => promise
                .then((result) => results.push(result))
                .catch((error) => err(error instanceof error ? error.message : String(error)))
        )
    );
    return results;
}
