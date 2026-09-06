// Defines 'fabric.mod.json' interface
interface FabricModJSON {
    authors: string[];
    depends: { [ depenency: string ]: string; }
    description: string;
    id: string;
    name: string;
    version: string;
}
