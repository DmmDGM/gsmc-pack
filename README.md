# Geesecraft Pack

## About

An automatic script to download necessary mods from Modrinth and/or direct URLs, mostly for the Geesecraft server.

## Install

Run the following commands:

```sh
git clone https://github.com/DmmDGM/gsmc-pack
cd gsmc-pack
bun i
```

## Sync from Pack.json

Create a `pack.json` or `pack.jsonc` file. Inside should be an array of strings.

For Modrinth downloads, use `modrinth;PLATFORM;VERSION;MOD-ID` for the origin string.

> [!NOTE] By default, the latest revision that matches those filters will be chosen.
> This can be changed by specifying a `;SPECIFIC-REVISION-CODE` after it.

For direct URL downloads, use `direct;MOD-ID;URL` for the origin string.

Your `pack.json` or `pack.jsonc` should look something like this:

```json
[
    "modrinth;fabric;1.21.5;fabric-api",
    "direct;tech-reborn;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar",
]
```

Then run the following to see your `.jar`s being downloaded in the `pack` directory:

```sh
bun run sync
```
