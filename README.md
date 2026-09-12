# Geesecraft Minecraft Autopacker

## Synopsis

A simple command-line based Minecraft package manager.

Work in progress...

## Demo

![demo video](/docs/2026-09-07-14-20-56.gif)

## Roadmap

Features

- [x] `init` # Initialize blank 'gsmc-pack.json' file.
- [x] `add [registry:]<major>[@minor]` # Add addon to `gsmc-pack.json` file.
    - [ ] `add [registry:]<major>[@minor][/type]` # Use preset lookup instead of match first.
- [x] `remove [hash]` # Remove addon from `gsmc-pack.json` file.
    - [ ] `remove [id]` # Remove addon from `gsmc-pack.json` file by ID.
- [x] `list` # Lists addons in `gsmc-pack.json` file.
- [x] `rebuild` # Rebuilds `gsmc-pack.json` file from instance instead. This is for helping new users setup gsmc-pack from existing builds.
- [x] `install` # Installs addons according to the `gsmc-pack.json` file.
- [x] `upgrade` # Upgrades all addons to the latest version of the same Minecraft version.
    - [ ] `upgrade <hash/id>[@minor][/type]` # Upgrade to specific minor release.
- [ ] `migrate` # Migrate all addons to a different Minecraft version or mod loader etc.

## How to Use?

I'm still working on the CLI. Although you should be able to clone it and play around with the code for now.
The basic functionality works, I just need to work on better CLI integration so `gsmc-pack` can both work as a library and as a cli tool.

Essentially, the goal here is kinda to make gsmc-pack a package manager for modrinth/curse-forge mods. :3

## Updates

I'm busy with kolleg, so I'll most likely update the mod during weekends.
Any feedback is appreciated. <3
