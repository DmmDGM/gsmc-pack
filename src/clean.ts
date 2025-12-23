// Imports
import * as library from "./library";
import { printYell } from "./library";

// Runs script
await library.run(async () => {
    // Cleans directory
    await library.clean();
        
    // Prints message
    printYell(`Directory ${library.packd} cleaned.`);
});