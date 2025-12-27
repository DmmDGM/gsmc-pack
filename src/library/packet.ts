// Defines interface
export interface Packet {
    // Defines raw fields
    readonly flags: Set<string>;
    readonly upstream: string;
    readonly values: string[];
    
    // Defines origin fields
    readonly label: string;

    // Defines api methods
    sync(): Promise<void>;
    test(): Promise<void>;
}

// Exports
export default Packet;
