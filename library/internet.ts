// Imports
import NodeCache from "node-cache";

// Creates cache
export const cache = new NodeCache();

// Defines cfetch function
export function cfetch(request: Request): Promise<Response> {
    // Checks cached
    const key = request.method + " " + request.url;
    const cached = cache.get<Promise<Response>>(request.url);
    if(typeof cached !== "undefined") return cached;
    
    // Creates respoes
    const response = fetch(request);
    cache.set(key, response);
    return response;
}
