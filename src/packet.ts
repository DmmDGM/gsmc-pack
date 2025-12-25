// Defines interface
export interface Packet {
    // Defines raw fields
    readonly flags: Set<string>;
    readonly origin: string[];

    // Defines api methods
    sync(): Promise<void>;
    test(): Promise<void>;
}

// Exports
export default Packet;
