// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./model/instance";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/test/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
await instance.initGSMCPackFile();
const [ successes, failures ] = await instance.rebuildGSMCPackAddons();
console.log("Failed rebuilds:", failures.map((failure) => failure.path).join(" "));
