// Imports
import nodeCrypto from "node:crypto";
import nodePath from "node:path";

// Defines types
export type ModrinthEntry = {
    code: string;
    date: Date;
    hash: string;
    name: string;
    platform: string;
    revision: string;
    size: number;
    tag: string;
    url: string;
    version: string;
}

// Defines functions
export async function searchModrinth(
    tag: string,
    platform: string,
    version: string,
    override: string | null = null
): Promise<ModrinthEntry> {
    // Creates trace
    const trace = `${tag}.${platform}.${version}.${override ?? "-"}`;
    
    // Creates request
    const request = await fetch(`https://api.modrinth.com/v2/project/${tag}/version?loader=${JSON.stringify([ platform ])}&game_versions=${JSON.stringify([ version ])}`);
    if(!request.ok) throw new Error(`No projects found (${trace}).`);
    
    // Parses projects
    const projects = await request.json() as {
        date_published: string;
        files: {
            hashes: { sha512: string; };
            primary: boolean;
            size: number;
            url: string;
        }[];
        id: string;
        name: string;
        version_number: string;
    }[];
    if(projects.length === 0) throw new Error(`Project found but none satisfied (${trace}).`);

    // Grabs project
    const project = override === null ?
        projects.sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published))[0] :
        projects.find((project) => project.id === override);
    if(typeof project === "undefined") throw new Error(`Project found but none matched (${trace}).`);
    
    // Grabs file
    if(project.files.length === 0) throw new Error(`Project found but contains no files (${trace}).`);
    const file = project.files.find((file) => file.primary) || project.files[0];
    
    // Returns entry
    return {
        code: project.id,
        date: new Date(project.date_published),
        hash: file.hashes.sha512,
        name: project.name,
        platform: platform,
        revision: project.version_number,
        size: file.size,
        tag: tag,
        url: file.url,
        version: version
    };
}
export async function downloadModrinth(entry: ModrinthEntry, keep: boolean = false): Promise<void> {
    // Creates trace
    const trace = `${entry.tag}.${entry.platform}.${entry.version}.${entry.code}`;

    // Downloads jar
    const headers = new Headers();
    headers.append("user-agent", "dmmdgm/gsmc-pack (dm12332131mdgaming@gmail.com)")
    const response = await fetch(entry.url, { headers });
    const destination = nodePath.resolve(import.meta.dir, `./pack/${entry.tag}.jar`);
    await Bun.write(destination, response);
    
    // Checks hash
    const jar = Bun.file(destination);
    const hash = nodeCrypto.createHash("sha512").update(Buffer.from(await jar.arrayBuffer())).digest("hex");
    if(hash !== entry.hash) {
        if(!keep) await jar.delete();
        throw new Error(`Project hash does not match (${trace})!`);
    }
}
export async function downloadDirect(tag: string, url: string): Promise<void> {
    // Downloads jar
    const response = await fetch(url);
    const destination = nodePath.resolve(import.meta.dir, `./pack/${tag}.jar`);
    await Bun.write(destination, response);
}
