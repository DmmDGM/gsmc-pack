// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./instance";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/.local/share/multimc/instances/Geesecraft S5 (1.20.1)/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
const mods = await instance.readModsDirectory();
console.log(await mods[0].parseAsFabricMod());
