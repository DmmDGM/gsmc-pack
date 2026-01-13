// Builds gsmc-pack
await Promise.all([
    Bun.build({
        entrypoints: [ "index.ts" ],
        compile: {
            outfile: "bin/gsmc-pack-darwin-arm64",
            target: "bun-darwin-arm64"
        },
        minify: true,
        sourcemap: "linked"
    }).then(() => console.log("Compiled darwin (arm64).")),
    Bun.build({
        entrypoints: [ "index.ts" ],
        compile: {
            outfile: "bin/gsmc-pack-darwin-x64",
            target: "bun-darwin-x64"
        },
        minify: true,
        sourcemap: "linked"
    }).then(() => console.log("Compiled darwin (x64).")),
    Bun.build({
        entrypoints: [ "index.ts" ],
        compile: {
            outfile: "bin/gsmc-pack-linux-arm64",
            target: "bun-linux-arm64"
        },
        minify: true,
        sourcemap: "linked"
    }).then(() => console.log("Compiled linux (arm64).")),
    Bun.build({
        entrypoints: [ "index.ts" ],
        compile: {
            outfile: "bin/gsmc-pack-linux-x64",
            target: "bun-linux-x64"
        },
        minify: true,
        sourcemap: "linked"
    }).then(() => console.log("Compiled linux (x64).")),
    Bun.build({
        entrypoints: [ "index.ts" ],
        compile: {
            outfile: "bin/gsmc-pack-windows-x64.exe",
            target: "bun-windows-x64"
        },
        minify: true,
        sourcemap: "linked"
    }).then(() => console.log("Compiled windows (x64)."))
]);

// Exports
export {};
