# Geesecraft Autopack (gsmc-pack)

## About

An automatic scrpit to check or download necessary Minecraft resources from various platforms.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Dependency Scan](#dependency-scan)
- [Synchronize Pack](#synchronize-pack)
- [Origin Test](#origin-test)

## Installation

Run the following commands:

```sh
git clone https://github.com/DmmDGM/gsmc-pack
cd gsmc-pack
bun i
```

## Basic Setup

Create a `pack.jsonc` file containing an array of origin strings.

Origin strings are separated by `;` and follow the below format:
| Method | Format | Purpose |
| - | - | - |
| Assume | `assume;$LABEL` | Declares the origin as available, useful when planning but the origin does not exist yet. |
| Direct URL | `direct;$LABEL;$URL;$FILE` | Creates an origin whose target can be found via a direct URL. |
| Modrinth | `modrinth;$LABEL;$PLATFORM;$VERSION` | Creates an origin whose target can be found on Modrinth. |

| Key Words | Definition | Example |
| - | - | - |
| `$FILE` | The file name which the origin should direct to when syncing. | `tech-reborn-5.13.4.jar`, `team-midnight-dust/better-leaves.zip` |
| `$LABEL` | The ID of the origin as found in its corresponding database. | `fabric-api`, `sodium`, `ae2` |
| `$URL` | The direct URL of the origin. | `https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar`, `https://github.com/TeamMidnightDust/BetterLeavesLite/archive/refs/heads/main.zip` |
| `$PLATFORM` | The loader the origin is supposed to run on. | `fabric`, `neoforge`, `minecraft`, `optifine`, `iris` |
| `$VERSION` | The Minecraft vrsion the origin is supposed to run on. | `1.21.1`, `1.20-pre1`, `22w42a` |

Example `pack.jsonc`:

```json
[
    "modrinth;fabric-api;fabric;1.21.5",
    "modrinth;iris;fabric;1.21.5",
    "modrinth;modmenu;fabric;1.21.5",
    "modrinth;sodium;fabric;1.21.5",
    "direct;tech-reborn;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar;TechReborn-5.13.4.jar"
]
```

## Dependency Scan

This action reads your `pack.jsonc` file and prints out a dependency tree, useful for identifying missing or conflicting origins in your pack:

```sh
bun run scan
```

> [!NOTE]
> Only Modrinth origins can be scanned as of right now.

Example Result:

```
[%] Origin direct;tech-reborn;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar;TechReborn-5.13.4.jar cannot be scanned.
[✓] Origin modrinth;fabric-api;fabric;1.21.5 is satisfied.
[✓] Origin modrinth;sodium;fabric;1.21.5 is satisfied.
[✗] Origin modrinth;modmenu;fabric;1.21.5 is not satisfied.
    [-] Dependency placeholder-api is required but is not found.
    [+] Dependency fabric-api is required and is found.
[✓] Origin modrinth;iris;fabric;1.21.5 is satisfied.
    [+] Dependency sodium is required and is found.
[@] Successfully scanned 5 / 5 origins.
```

## Synchronize Pack

This action reads your `pack.jsonc` file and downloads everything into your `pack/` directory:

```sh
bun run sync
```

Example Result:

```
[✓] Successfully synced origin modrinth;modmenu;fabric;1.21.5, download size 1.02 MiB.
[✓] Successfully synced origin modrinth;sodium;fabric;1.21.5, download size 1.27 MiB.
[✓] Successfully synced origin modrinth;fabric-api;fabric;1.21.5, download size 2.14 MiB.
[✓] Successfully synced origin modrinth;iris;fabric;1.21.5, download size 2.58 MiB.
[✓] Successfully synced origin direct;tech-reborn;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar;TechReborn-5.13.4.jar, download size 6.12 MiB.
[@] Successfully synced 5 / 5 origins.
```

## Origin Test

This action reads your `pack.jsonc` file and checks if the download links are valid:

```sh
bun run sync
```

Example Result:

```
[✓] Origin modrinth;fabric-api;fabric;1.21.5 is reachable.
[✓] Origin modrinth;modmenu;fabric;1.21.5 is reachable.
[✓] Origin modrinth;iris;fabric;1.21.5 is reachable.
[✓] Origin modrinth;sodium;fabric;1.21.5 is reachable.
[✓] Origin direct;tech-reborn;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar;TechReborn-5.13.4.jar is reachable.
[@] Successfully tested 5 / 5 origins.
```

## Advanced Setup

Each origin can also be followed by additional flags using the format `;;flag0;flag1;flag2...`.

| Flag | Purpose |
| - | - |
| `no-sync` | Do not sync when running `bun run sync`, useful when origin is only included for dependency check only. |

You can specify another `pack.jsonc` file by using the `PACKF` environment variable.

```sh
PACKF=another-pack.jsonc bun run scan
```

You can specify another `pack/` directory by using the `PACKD` environment variable.

```sh
PACKD=another-pack bun run sync
```
