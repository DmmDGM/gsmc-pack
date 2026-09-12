// Imports
import nodeAssert from "node:assert";
import AdmZip from "adm-zip";
import { format } from "./errors";
import { MinecraftAddonType } from "./type";

/**
 * Sniffs the file for identifiable metadata to determine its addon type.
 * @param path The path to the file.
 * @returns The sniffed addon type of this file.
 */
export async function sniffMinecraftAddonType(path: string): Promise<MinecraftAddonType> {
    // Creates AdmZip archive
    const archive = new AdmZip(path);

    // Checks data pack metadata
    if(
        archive.getEntry("pack.mcmeta") &&
        archive.getEntry("data")
    ) return MinecraftAddonType.DATA_PACK;
    
    // Checks mod metadata
    if(
        archive.getEntry("fabric.mod.json") ||
        archive.getEntry("META-INF/mods.toml") ||
        archive.getEntry("META-INF/neoforge.mods.toml")
    ) return MinecraftAddonType.MOD;

    // Checks plugin metadata
    if(
        archive.getEntry("plugin.yml") ||
        archive.getEntry("paper-plugin.yml")
    ) return MinecraftAddonType.PLUGIN;

    // Checks resource pack metadata
    if(
        archive.getEntry("pack.mcmeta") &&
        archive.getEntry("assets")
    ) return MinecraftAddonType.RESOURCE_PACK;

    // Checks shader pack metadata
    if(
        archive.getEntry("shaders")
    ) return MinecraftAddonType.SHADER_PACK;

    // Checks texture pack metadata
    if(
        archive.getEntry("terrain.png")
    ) return MinecraftAddonType.TEXTURE_PACK;

    // Throws error
    nodeAssert(false, format("CORE:SNIFF_NO_VALID_IDENTIFIABLE_METADATA", { path }));
}