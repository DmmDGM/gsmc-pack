// Imports
import * as library from "./library";
import { say } from "./pretty";

// Tests origins
const origins = await library.origins();
const packets = await library.resolve(origins.map(async (origin) => await library.parse(origin)));
const tested = await library.resolve(packets.map(async (packet) => await library.test(packet)));
say(`Successfully tested ${tested.length} / ${origins.length} origins.`);
