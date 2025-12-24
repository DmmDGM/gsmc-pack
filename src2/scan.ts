// Imports
import * as library from "./library";
import { say } from "./pretty";

// Scans origins
const origins = await library.origins();
const packets = await library.resolve(origins.map(async (origin) => await library.parse(origin)));
const labels = new Set(packets.map((packet) => packet.label));
const scanned = await library.resolve(packets.map(async (packet) => await library.scan(packet, labels)));
say(`Successfully scanned ${scanned.length} / ${origins.length} origins.`);
