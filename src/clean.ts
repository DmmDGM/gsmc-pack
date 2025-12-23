// Imports
import * as library from "./library";

await library.run(async () => {
    // Cleans directory
    await library.clean();
        
    // Prints message
    library.printYell(`Directory ${library.packd} cleaned.`);
});