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
