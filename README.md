# Geesecraft Minecraft Autopacker

## About

A tool to downloads mods, shaders, resourcepacks, and more automatically, so you don't have to do it manually!

## Setup

> [!NOTE]
> Requires [Bun](https://bun.com) as runtime.

```sh
git clone https://github.com/DmmDGM/gsmc-pack
cd gsmc-pack
bun i
bun link
bunx gsmc-pack --help
```

## Usage

```sh
bunx gsmc-pack [--flags...]
```

## Flags

| Short | Long | Description |
| - | - | - |
| `-d` | `--directory {path-to-dir}` | Specifies a directory as the output directory.               |
| `-f` | `--file {path-to-file}`     | Specifies a .jsonc file as the input file.                   |
| `-P` | `--check-peers`             | Checks for peers in addition to the origin list.             |
| `-C` | `--clean`                   | Deletes the output direct to simulate a fresh start.         |
|      |                             | (Takes effect only if --test flag is disabled.)              |
|      |                             | (Effectively enables --force flag.)                          |
| `-M` | `--dot-minecraft`           | Places files in a .minecraft-like structure.                 |
| `-E` | `--elaborate`               | Makes extra requests to give more details about an error.    |
|      |                             | (Takes effect only if --verbose flag is enabled.)            |
| `-F` | `--force`                   | Packs files even if they already exist.                      |
| `-h` | `--help`                    | Prints this help menu.                                       |
| `-i` | `--ignore-warnings`         | Ignores all warnings.                                        |
| `-N` | `--nyaa`                    | Nyaa~! :3                                                    |
| `-T` | `--test`                    | Performs a dummy run but does not download the actual files. |
|      |                             | (Effectively enables --force flag.)                          |
| `-V` | `--verbose`                 | Prints more information about an error.                      |
| `-v` | `--version`                 | Prints the current version of gsmc-pack.                     |

## Tutorial

1. Create a `pack.jsonc` in your local directory.
2. Insert an array of `origins` inside the file, each line in the following format:
    - `$TARGET;download;$TYPE;$URL`
    - `$TARGET;modrinth;$PLATFORM;$VERSION`

    ```jsonc
    [
        // Examples
        "fabric-api;modrinth;fabric;1.21.5",
        "complementary-reimagined;modrinth;iris;1.21.5",
        "default-dark-mode;modrinth;minecraft;1.21.5",
        "tech-reborn;download;mod;https://github.com/TechReborn/TechReborn/releases/download/5.13.4/TechReborn-5.13.4.jar"

        // Note: You can also find in the example.jsonc file.
    ]
    ```

3. Run `bunx gsmc-pack`.

---

###### Last Updated: 2026-01-02 02:21 (EST).
