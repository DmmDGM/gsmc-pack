#!/usr/bin/bun
import { cwd as getCurrentDirectory } from "node:process";
import chalk from "chalk";
import yargs from "yargs";
import { MinecraftInstance } from "./minecraft-instance";

const argv = await yargs(process.argv.slice(2)).parse();
const values = argv["_"];

const instance = new MinecraftInstance(getCurrentDirectory())
switch(values[0]) {
    case "list": {
        const addons = await instance.listAddons();
        console.log("Linked");
        console.log(addons.linked.map((addon) => chalk.green(addon.source!.name!)).join("\n"));
        console.log("Unlinked");
        console.log(addons.unlinked.map((addon) => chalk.red(addon.source!.name!)).join("\n"));
        console.log("Missing");
        console.log(addons.missing.map((addon) => chalk.yellow(addon.upstream)).join("\n"));
        break;
    }
    default: {
        console.log(argv)
    }
}
