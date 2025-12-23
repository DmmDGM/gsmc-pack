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

## Usage

Create a `pack.jsonc` file. The file should contain an array of origin strings.
- For Modrinth, use `modrinth;MOD-ID;PLATFORM;VERSION` for the origin string.
- For direct URL, use `direct;MOD-ID;URL;FILE` for the origin string.

Your `pack.jsonc` should look something like this:

```json
[
    "modrinth;fabric-api;fabric;1.21.5",
    "direct;tech-reborn;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar;TechReborn-5.13.4.jar"
]
```

By default, it will look for `pack.jsonc` and will place all of the results in `pack/`.
This behavior can be changed by supplying the `PACKF` and `PACKD` environment variables.

## Clean

This action simply runs `rm -rf pack/`.

```sh
bun run clean
PACKF=your-pack.jsonc PACKD=your-pack-dir bun run clean
```

## Sniff

This action takes your `pack.jsonc` and checks if everything is available.

```sh
bun run sniff
PACKF=your-pack.jsonc PACKD=your-pack-dir bun run sniff
```

## Sync

This action takes your `pack.jsonc` and downloads everything inside into your `pack/` directory.

```sh
bun run sync
PACKF=your-pack.jsonc PACKD=your-pack-dir bun run sync
```

## Tree

This action takes your `pack.jsonc` and checks the entire dependency tree.

```sh
bun run tree
PACKF=your-pack.jsonc PACKD=your-pack-dir bun run tree
```
