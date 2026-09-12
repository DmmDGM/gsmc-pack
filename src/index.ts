// Imports
import nodePath from "node:path";
import { MinecraftInstance } from "./model/instance";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/test/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
const addons = await instance.listGSMCPackAddons();
const [ file, size, download ] = await addons[1].downloadFileFromMetadata();
let resolved = false;
download.then(() => resolved = true);

const interval = setInterval(() => {
    console.log(file.size, size);
    if(resolved) clearInterval(interval);
}, 10);
// await instance.initGSMCPackFile();
// const [ successes, failures ] = await instance.rebuildGSMCPackAddons();
// console.log("Failed rebuilds:", failures.map((failure) => failure.path).join(" "));
