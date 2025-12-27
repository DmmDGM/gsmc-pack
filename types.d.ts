// Defines source interface
interface Source {
    // Defines origin fields
    readonly origin: string;
    
    // Defines origin methods
    dep(): Promise<boolean>;
    sync(): Promise<boolean>;
    test(): Promise<boolean>;
}
