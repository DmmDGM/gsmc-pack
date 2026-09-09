// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./model/instance";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/.local/share/multimc/instances/Geesecraft S6 (1.21.5)/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
await instance.initPackFile("1.21.5");
const [ successes, failures ] = await instance.resyncAddons();
console.log("Failed resync:", failures.map((failure) => failure.path).join(" "));
