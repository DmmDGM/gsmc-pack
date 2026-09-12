// Imports
import nodePath from "node:path";
import chalk from "chalk";
import { MinecraftInstance } from "./model/instance";
import { MinecraftAddon } from "./model/addon";
import { MinecraftAddonUpstream } from "./core/upstream";
import { MinecraftAddonRegistry } from "./core/registries";

// Temporary test code
const dotMinecraftPath = nodePath.resolve("/home/dmmdgm/test/.minecraft/");
const instance = new MinecraftInstance(dotMinecraftPath);

const [ successes, failures, skipped ] = await instance.updateAddons();
console.log(successes.map((a) => chalk.green(a.metadata!.name)).join("\n"));
console.log(failures.map((a) => chalk.red(a.metadata!.name)).join("\n"));
console.log(skipped.map((a) => chalk.blue(a.metadata!.name)).join("\n"));
