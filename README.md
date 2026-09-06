# Geesecraft Minecraft Autopacker

## Synopsis

A simple command-line based Minecraft package manager.

Work in progress...

## Roadmap

basics
- [ ] ability to detect mods and install stuff online

cmdline
- [ ] `gsmc-pack init` # reads current .minecraft directory and generates gsmc-pack.json
- [ ] `gsmc-pack add <...id[@version]>` # installs mod / resource pack / shader pack
- [ ] `gsmc-pack remove <...id>` # uninstalls mod / resource pack / shader pack
- [ ] `gsmc-pack enable <...id>` # enables mod / resource pack / shader pack by removing the .disabled extension (multimc style)
- [ ] `gsmc-pack disable <...id>` # disables mod / resource pack / shader pack by adding the .disabled extension (multimc style)
- [ ] `gsmc-pack install` # reads gsmc-pack.json and install everything as specified, good for sharing modpacks via gsmc-pack.json
- [ ] `gsmc-pack update [...id[@version]]` # updates mod / resource pack / shader pack without changing minecraft version
- [ ] `gsmc-pack migrate <minecraft-version> [...id[@version]]` # updates mod / resource pack / shader pack to the corresponding minecraft version
- [ ] `gsmc-pack upgrade` # upgrades gsmc-pack from github ig? prob just gonna be a `git pull` if im too lazy to make an installer for it
- [ ] `gsmc-pack scan` # check for updatable packages and refreshes gsmc-pack.json
- [ ] `gsmc-pack list` # list all mod / resource pack / shader packs installed - this only checks gsmc-pack.json, will need `gsmc-pack scan` to update
- [ ] if time allows, maybe i will do a direct url install, probably `gsmc-pack link <url>`, which means its not updatable or migratable, but at least it will appear on `gsmc-pack.json` and stuff idk

extra features
- [ ] modrinth registry support
- [ ] forge registry support
- [ ] api keys storage (probably just gonna be .gsmc-pack/modrinth.key and .gsmc-pack/forge.key)
- [ ] installer? (idk yet, for now ill just focus on manual build, someone smarter than me can figure out the installer stuff)