// 
class ModrinthRegistry {
    static readonly API = "https://api.modrinth.com/v2/"
    static readonly USER_AGENT = "DmmDGM/gsmc-pack/3.0.0 (dev) (dmmdgm@dmmdgm.dev)";

    static async fetchProjectDetails(id: string) {
        const response = await fetch(new URL(`/project/${id}`, ModrinthRegistry.API))
    }
}
