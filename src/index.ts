// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./model/instance";
import { MinecraftModFlavor } from "./core/common";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/.local/share/multimc/instances/Geesecraft S6 (1.21.5)/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
await instance.initPackFile("1.21.5", MinecraftModFlavor.FABRIC);
const [ successes, failures ] = await instance.refreshAddons();
console.log("Failed refreshes:", failures.map((failure) => failure.path).join(" "));
