// Imports
import nodePath from "node:path";
import chalk from "chalk";
import { MinecraftInstance } from "./model/instance";
import { MinecraftAddon } from "./model/addon";
import { MinecraftAddonUpstream } from "./core/upstream";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/test/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);
// await instance.initGSMCPackFile();
// await instance.rebuildGSMCPackAddons();

const addons = await instance.listGSMCPackAddons();
const checks = await Promise.all(addons.map((addon) => {
    return new Promise<[ MinecraftAddon, MinecraftAddonUpstream | null ]>(async (resolve) => {
        resolve([ addon, await addon.checkUpdatableUpstream() ]);
    });
}));
const updatables = checks.filter((check) => check[1] !== null);

await instance.addGSMCPackAddon(updatables[0][1]!)

console.log(updatables.map((updatable) => `${
    chalk.blue(`${updatable[0].metadata!.name}@${updatable[0].metadata!.version}`)
} can be updated to ${
    chalk.yellow(`${updatable[1]!.major}@${updatable[1]!.minor}`)
}`).join("\n"));
