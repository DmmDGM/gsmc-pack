// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./instance";
import { ModrinthRegistry } from "./modrinth";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/.local/share/multimc/instances/Geesecraft S5 (1.20.1)/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
const mods = await instance.readModsDirectory();
const mod = await mods[1].parseAsFabricMod();
console.log(await ModrinthRegistry.fetchProjectIDFromFileHash(await mods[0].compileFileHash()))
console.log(await ModrinthRegistry.fetchProjectIDFromFileHash(await mods[1].compileFileHash()))
console.log(await ModrinthRegistry.fetchProjectIDFromFileHash(await mods[2].compileFileHash()))
console.log(await ModrinthRegistry.fetchProjectIDFromFileHash(await mods[3].compileFileHash()))
console.log(await ModrinthRegistry.fetchProjectIDFromFileHash(await mods[4].compileFileHash()))
console.log(await ModrinthRegistry.fetchProjectIDFromFileHash(await mods[5].compileFileHash()))
