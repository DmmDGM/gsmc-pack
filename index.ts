// Imports
import nodePath from "node:path";
import nodeUtil from "node:util";
import chalk from "chalk";

// Defines types
interface ModrinthMatch {
    filename:  string;
    hash:      string;
    platforms: string[];
    rejects:   string[];
    requires:  string[];
    slug:      string;
    type:      "mod" | "resource" | "shader" | "unknown";
    url:       string;
    versions:  string[];
}

// Defines shortcuts
const { blue, cyan, dim, green, magenta: pink, red } = chalk;
const { error: err, log } = console;

// Defines flags
const { values: flags } = nodeUtil.parseArgs({
    allowNegative: false,
    allowPositionals: true,
    args: Bun.argv,
    options: {
        "directory":     { default: "./pack/",      multiple: false, short: "d", type: "string" },
        "file":          { default: "./pack.jsonc", multiple: false, short: "f", type: "string" },
        "auto":          { default: false, multiple: false, short: "A", type: "boolean" },
        "dot-minecraft": { default: false, multiple: false, short: "M", type: "boolean" },
        "elaborate":     { default: false, multiple: false, short: "E", type: "boolean" },
        "force":         { default: false, multiple: false, short: "F", type: "boolean" },
        "nyaa":          { default: false, multiple: false, short: "N", type: "boolean" },
        "test":          { default: false, multiple: false, short: "T", type: "boolean" },
        "verbose":       { default: false, multiple: false, short: "V", type: "boolean" },
    },
    strict: true,
    tokens: false
});

// Defines cache
const rejects: Set<string> = new Set();
const targets: Set<string> = new Set();

// Defines paths
const packd = nodePath.resolve(flags["directory"]);
const packf = nodePath.resolve(flags["file"]);

// Defines functions
function fetchFile(filename: string, type: string): Bun.BunFile {
    // Checks dot-minecraft flag
    if(flags["dot-minecraft"]) {
        // Defines structures
        const structures = {
            "mod":      "./mods/",
            "resource": "./resourcepacks/",
            "shader":   "./shaderpacks/",
            "texture":  "./texturepacks/",
            "unknown":  "./unknown/",
            "world":    "./saves/"
        } as const;

        // Creates structured file
        if(!(type in structures)) throw new Error(`Unknown type ${blue(type)}.`);
        const structure = structures[type as keyof typeof structures];
        return Bun.file(nodePath.resolve(packd, structure, filename));
    }

    // Creates flat file
    return Bun.file(nodePath.resolve(packd, filename));
}
function parseDisposition(response: Response): string | null {
    // Fetches disposition
    const disposition = response.headers.get("content-disposition");
    if(disposition === null) return null;
    
    // Parses filename
    const matches = disposition.match(/filename=(?:"(.+)"|(.+))/);
    if(matches === null) return null;
    return matches[1] ?? matches[2] ?? null;
}
function parseOrigin<Pattern extends readonly string[]>(
    origin:  string,
    pattern: Pattern
): Record<Pattern[number], string> {
    // Checks parameters
    const parameters = origin.split(";");
    if(parameters.length < pattern.length) throw new Error(`Invalid origin ${blue(origin)}, expects pattern ${blue(pattern.join(";"))}.`);

    // Parses origin
    return Object.fromEntries(pattern.map((key, index) => [ key as Pattern[number], parameters[index] ] as const)) as Record<Pattern[number], string>;
}
function verifyHash(algorithm: Bun.SupportedCryptoAlgorithms, bytes: Uint8Array<ArrayBuffer>, hash: string): boolean {
    // Verifies hash
    return Bun.CryptoHasher.hash(algorithm, bytes).toHex() === hash;
}
async function modrinthFetch(request: Request): Promise<Response> {
    // Configures request
    if(!request.url.startsWith("https://api.modrinth.com/v2/")) throw new Error("Request does not interact with the modrinth API.");
    request.headers.append("user-agent", "DmmDGM/gsmc-pack/1.5.0");
    
    // Attempts fetch
    for(let attempts = 0; attempts < 3; attempts++) {
        // Fetches response
        const response = await fetch(request.clone());

        // Checks ratelimit
        const xratelimit = response.headers.get("x-ratelimit-remaining");
        if(xratelimit === null) throw new Error("Missing header 'x-ratelimit-remaining' in response.");
        const ratelimit = parseInt(xratelimit) ?? 0;
        if(ratelimit < 1) {
            const xtimeout = response.headers.get("x-ratelimit-reset");
            if(xtimeout === null) throw new Error("Missing header 'x-ratelimit-reset' in response.");
            const timeout = parseInt(xtimeout) ?? 0;
            await Bun.sleep(timeout * 1000 + 1000);
            continue;
        }

        // Returns response
        return response;
    }

    // Throws error
    throw new Error("Cannot reach Modrinth API.");
}
async function modrinthMatch(id: string, platforms: string[] | null, versions: string[] | null): Promise<ModrinthMatch | null> {
    // Defines maps
    const types = {
        "mod":          "mod",
        "modpack":      "unknown",
        "resourcepack": "resource",
        "shader":       "shader"
    } as const;
    
    // Fetches modrinth project
    const modrinthProjectURL = new URL(`./project/${id}`, "https://api.modrinth.com/v2/");
    const modrinthProjectRequest = new Request(modrinthProjectURL);
    const modrinthProjectResponse = await modrinthFetch(modrinthProjectRequest);
    if(!modrinthProjectResponse.ok) return null;
    const modrinthProjectJSON = await modrinthProjectResponse.json() as Record<string, unknown>;

    // Fetches modrinth versions
    const modrinthVersionsURL = new URL(`./project/${id}/version`, "https://api.modrinth.com/v2/");
    if(platforms !== null) modrinthVersionsURL.searchParams.append("loaders", JSON.stringify(platforms));
    if(versions !== null) modrinthVersionsURL.searchParams.append("game_versions", JSON.stringify(versions));
    const modrinthVersionsRequest = new Request(modrinthVersionsURL);
    const modrinthVersionsResponse = await modrinthFetch(modrinthVersionsRequest);
    if(!modrinthVersionsResponse.ok) return null;
    const modrinthVersionsJSON = await modrinthVersionsResponse.json() as Record<string, unknown>[];

    // Parses data
    const modrinthProject = {
        slug: modrinthProjectJSON["slug"] as string,
        type: types[modrinthProjectJSON["project_type"] as keyof typeof types]
    };
    const modrinthVersions = modrinthVersionsJSON
        .map((data) => ({
            date: new Date(data["date_published"] as string),
            dependencies: (data["dependencies"] as Record<string, unknown>[])
                .map((subdata) => ({
                    id: subdata["project_id"] as string,
                    type: subdata["dependency_type"] as "embedded" | "incompatible" | "optional" | "required"
                })),
            files: (data["files"] as Record<string, unknown>[])
                .map((subdata) => ({
                    filename: subdata["filename"] as string,
                    hash: (subdata["hashes"] as { sha512: string; }).sha512,
                    primary: subdata["primary"] as boolean,
                    url: subdata["url"] as string
                })),
            platforms: data["loaders"] as string[],
            versions: data["game_versions"] as string[]
        }))
        .sort((a, b) => +b.date - +a.date)
        .filter((data) => data.files.length > 0);
    if(modrinthVersions.length === 0) return null;
    const modrinthVersion = modrinthVersions[0];
    const modrinthDependencies = modrinthVersion.dependencies;
    const modrinthFile = modrinthVersion.files.find((data) => data.primary) || modrinthVersion.files[0];
    return {
        filename:  modrinthFile.filename,
        hash:      modrinthFile.hash,
        platforms: modrinthVersion.platforms,
        rejects:   modrinthDependencies.filter((data) => data.type === "incompatible").map((data) => data.id),
        requires:  modrinthDependencies.filter((data) => data.type === "required").map((data) => data.id),
        slug:      modrinthProject.slug,
        type:      modrinthProject.type,
        url:       modrinthFile.url,
        versions:  modrinthVersion.versions
    };
}
async function modrinthPeers(match: ModrinthMatch): Promise<{ rejects: string[]; requires: string[]; }> {
    // Fetches modrinth rejects
    const modrinthRejectsURL = new URL("./projects", "https://api.modrinth.com/v2/");
    modrinthRejectsURL.searchParams.append("ids", JSON.stringify(match.rejects));
    const modrinthRejectsRequest = new Request(modrinthRejectsURL);
    const modrinthRejectsResponse = await modrinthFetch(modrinthRejectsRequest);
    if(!modrinthRejectsResponse.ok) return { rejects: [], requires: [] };
    const modrinthRejectsJSON = await modrinthRejectsResponse.json() as Record<string, unknown>[];
    
    // Fetches modrinth requires
    const modrinthRequiresURL = new URL("./projects", "https://api.modrinth.com/v2/");
    modrinthRequiresURL.searchParams.append("ids", JSON.stringify(match.requires));
    const modrinthRequiresRequest = new Request(modrinthRequiresURL);
    const modrinthRequiresResponse = await modrinthFetch(modrinthRequiresRequest);
    if(!modrinthRequiresResponse.ok) return { rejects: [], requires: [] };
    const modrinthRequiresJSON = await modrinthRequiresResponse.json() as Record<string, unknown>[];
    
    // Parses data
    const modrinthRejects = modrinthRejectsJSON.map((data) => data["slug"] as string);
    const modrinthRequires = modrinthRequiresJSON.map((data) => data["slug"] as string);
    return { rejects: modrinthRejects, requires: modrinthRequires };
}
async function writeBytes(file: Bun.BunFile, bytes: Uint8Array<ArrayBuffer>): Promise<void> {
    // Writes file
    try { await file.write(bytes); }
    catch(error) { await file.delete(); throw new Error(`Failed to write file ${blue(file.name)}.`); }
}

// Handles exceptions
process.on("uncaughtException", (error) => {
    err(red(`[-] ${error.message}`));
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    err(red(`[-] ${String(reason)}`));
    process.exit(1);
});

// Fetches origins
const origins: string[] = [];
try { const result = await import(packf) as { default: string[]; }; Object.assign(origins, result.default); }
catch { throw new Error(`File ${blue(packf)} is not found.`); }

// Evaluates origins
for(const origin of origins) {
    try {
        // Parses origin
        const { $TARGET, $METHOD } = parseOrigin(origin, [ "$TARGET", "$METHOD" ] as const);
        if(targets.has($TARGET)) {
            log(dim(`[#] Duplicate found for target ${blue($TARGET)}, skipped.`));
            continue;
        }
        
        // Evaluates origin
        switch($METHOD) {
            case "download": {
                // Parses origin
                const { $TYPE, $URL } = parseOrigin(origin, [ "$TARGET", "$METHOD", "$TYPE", "$URL" ] as const);

                // Fetches lookup
                const lookup = await fetch($URL, { method: "HEAD" });
                if(!lookup.ok) throw new Error(`Failed to fetch URL ${blue($URL)}.`);

                // Fetches file
                const filename = parseDisposition(lookup) ?? $URL.split("/").at(-1) ?? $TARGET;
                const file = fetchFile(filename, $TYPE);

                // Packs origin
                switch(true) {
                    case flags["test"]: {
                        // Prints conclusion
                        log(green(`[+] Target ${blue($TARGET)} is okay.`));
                        targets.add($TARGET);
                        continue;
                    }
                    case await file.exists() && !flags["force"]: {
                        // Prints conclusion
                        log(dim(`[#] Target ${blue($TARGET)} already exists, filename ${blue(file.name)}.`));
                        targets.add($TARGET);
                        continue;
                    }
                    default: {
                        // Creates response
                        const response = await fetch($URL);
                        if(!response.ok) throw new Error(`Failed to fetch URL ${blue($URL)}.`);
                        
                        // Writes bytes
                        const bytes = await response.bytes();
                        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
                        await writeBytes(file, bytes);

                        // Prints conclusion
                        log(green(`[+] Target ${blue($TARGET)} packed, file size ${blue(size)} MiB, filename ${blue(file.name)}.`));
                        targets.add($TARGET);
                        continue;
                    }
                }
            }
            case "modrinth": {
                // Parses origin
                const { $PLATFORM, $VERSION } = parseOrigin(origin, [ "$TARGET", "$METHOD", "$PLATFORM", "$VERSION" ] as const);

                // Fetches match
                const match = await modrinthMatch($TARGET, [ $PLATFORM ], [ $VERSION ]);
                if(!match) {
                    // Checks nearest
                    if(flags["elaborate"]) {
                        const nearest = await modrinthMatch($TARGET, [ $PLATFORM ], null);
                        if(nearest === null) throw new Error(`Target ${blue($TARGET)} does not supported platform ${blue($PLATFORM)} on Modrinth.`);
                        throw new Error(`Target ${blue($TARGET)} only supports platform ${blue($PLATFORM)}, version(s) ${blue(nearest.versions.join(", "))} on Modrinth.`);
                    }

                    // Throws error
                    throw new Error(`Cannot find target ${blue($TARGET)} on Modrinth.`);
                }

                // Checks dependencies
                if(flags["auto"]) {
                    const peers = await modrinthPeers(match);
                    for(const peer of peers.rejects) {
                        log(dim(`[#] Target ${blue($TARGET)} is incompatible with peer ${blue(peer)}, flagged in origins.`));
                        rejects.add(peer);
                    }
                    for(const peer of peers.requires) {
                        log(dim(`[#] Target ${blue($TARGET)} requires peer ${blue(peer)}, added to origins.`));
                        if(!targets.has(peer)) origins.push(`${peer};modrinth;${$PLATFORM};${$VERSION}`);
                    }
                }
                
                // Fetches file
                const file = fetchFile(match.filename, match.type);

                // Packs origin
                switch(true) {
                    case flags["test"]: {
                        // Fetches lookup
                        const lookup = await fetch(match.url, { method: "HEAD" });
                        if(!lookup.ok) throw new Error("Cannot reach modrinth CDN.");

                        // Prints conclusion
                        log(green(`[+] Target ${blue($TARGET)} is okay.`));
                        targets.add($TARGET);
                        continue;
                    }
                    case await file.exists() && !flags["force"]: {
                        // Prints conclusion
                        log(dim(`[#] Target ${blue($TARGET)} already exists, filename ${blue(file.name)}.`));
                        targets.add($TARGET);
                        continue;
                    }
                    default: {
                        // Creates response
                        const response = await fetch(match.url);
                        if(!response.ok) throw new Error("Cannot reach modrinth CDN.");
                        
                        // Verifies bytes
                        const bytes = await response.bytes();
                        if(!verifyHash("sha512", bytes, match.hash)) throw new Error("File hash does not match expected hash.");

                        // Writes bytes
                        const size = Math.round(bytes.length / 1024 / 1024 * 100) / 100;
                        await writeBytes(file, bytes);

                        // Prints conclusion
                        log(green(`[+] Target ${blue($TARGET)} packed, file size ${blue(size)} MiB, filename ${blue(file.name)}.`));
                        targets.add($TARGET);
                        continue;
                    }
                }
            }
            default: {
                throw new Error(`Invalid origin ${blue(origin)}, unknown method ${blue($METHOD)}.`);
            }
        }
    }
    catch(error) {
        // Prints error
        err(red(`[-] Origin ${blue(origin)} failed.`));
        if(flags["verbose"])
            err(red(dim(`    [-] ${error instanceof Error ? error.message : String(error)}`)));
    }
}

// Prints message
log(cyan(`[@] Total ${pink(origins.length)} origin(s), final ${pink(targets.size)} okay.`));

// Prints followups
rejects.forEach((peer) => {
    if(targets.has(peer)) err(red(`[!] Peer ${blue(peer)} conflicts with one or more targets.`));
});
