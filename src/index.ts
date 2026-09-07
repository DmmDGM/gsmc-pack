// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./instance";
import { MinecraftModFlavor } from "./common";
import { ModrinthRegistry } from "./modrinth";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/.local/share/multimc/instances/Geesecraft S5 (1.20.1)/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
// await instance.initPackFile("1.20.1", MinecraftModFlavor.FABRIC);
// const [ successes, failures ] = await instance.refreshAddons();
// console.log("Failed refreshes:", failures.map((failure) => failure.path).join(" "));
console.log((await ModrinthRegistry.fetchVersionsFromProjectID("fabric-api", MinecraftModFlavor.FABRIC, "1.20.1"))[0]);