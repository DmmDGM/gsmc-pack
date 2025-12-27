// Imports
import { err } from "./pretty";

// Defines toolbox
export function fmap<In, Out>(array: In[], callback: (value: In, index: number, array: In[]) => Out): NonNullable<Out>[] {
    // Maps array
    return array
        .map(callback)
        .filter((value) => typeof value !== "undefined" && value !== null);
}
export async function fsettle<Type>(promises: Promise<Type>[]): Promise<NonNullable<Type>[]> {
    // Settles promises
    const results = await Promise.allSettled(promises);
    return results
        .filter((result) => {
            if(result.status === "rejected") err(result.reason);
            return result.status === "fulfilled";
        })
        .map((result) => result.value)
        .filter((value) => typeof value !== "undefined" && value !== null);
}
