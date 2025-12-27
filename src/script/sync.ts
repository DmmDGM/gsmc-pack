// Imports
import * as library from "../library";
import { say } from "./pretty";

// Syncs origins
const origins = await library.origins();
const packets = await library.resolve(origins.map(async (origin) => await library.parse(origin)));
const synced = await library.resolve(packets.map(async (packet) => await library.sync(packet)));
say(`Successfully synced ${synced.length} / ${origins.length} origins.`);
