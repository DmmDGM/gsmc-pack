// Imports
import { rmdir as removeDirectory } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { error } from "./error";

/** Minecraft download. */
export class MinecraftDownload {
    /** Whether download has been disposed. */
    private _disposed: boolean = false;
    /** Temporary directory. */
    readonly directory: string;
    /** Download promise. */
    readonly download: Promise<ArrayBuffer>;
    /** Temporary file. */
    readonly file: Bun.BunFile;
    /** Source filename. */
    readonly filename: string;
    /** SHA-1 hash. */
    readonly hash: string;
    /** Download response. */
    readonly response: Response;
    /** Download size. */
    readonly size: number;
    
    /**
     * Creates new Minecraft download.
     * @param file Temporary file.
     * @param directory Temporary directory.
     * @param filename Source filename.
     * @param hash SHA-1 hash.
     * @param response Download response.
     */
    constructor(file: Bun.BunFile, directory: string, filename: string, hash: string, response: Response) {
        // Estimates size
        const size = Number(response.headers.get("content-length"));
        if(isNaN(size)) throw new Error(error("DOWNLOAD_BAD_UPSTREAM"));
        
        // Creates download
        const download = new Promise<ArrayBuffer>(async (resolve, reject) => {
            // Writes response
            await file.write(response);

            // Verifies hash
            const buffer = await file.arrayBuffer();
            const fileHash = Bun.CryptoHasher.hash("sha1", buffer).toHex();
            if(hash !== fileHash) reject(error("DOWNLOAD_BAD_UPSTREAM"));

            // Resolves buffer
            resolve(buffer);
        });

        // Inits fields
        this.directory = directory;
        this.download = download;
        this.file = file;
        this.filename = filename;
        this.hash = hash;
        this.response = response;
        this.size = size;
    }

    /**
     * Disposes download.
     */
    async disposeDownload(): Promise<void> {
        // Checks disposed
        if(this._disposed) throw new Error(error("DOWNLOAD_ALREADY_DISPOSED"));

        // Disposes download
        await this.file.unlink();
        await removeDirectory(this.directory);
    }

    /**
     * Gets download progress.
     * @returns Download progress.
     */
    getProgress(): number {
        // Returns file size
        return this.file.size;
    }

    /**
     * Whether download has been disposed.
     */
    get isDisposed(): boolean {
        // Returns disposed
        return this._disposed;
    }

    /**
     * Writes download to file.
     * @param directory Source directory.
     */
    async writeFile(directory: string): Promise<Bun.BunFile> {
        // Checks disposed
        if(this._disposed) throw new Error(error("DOWNLOAD_ALREADY_DISPOSED"));

        // Awaits download
        await this.download;

        // Copies file
        const file = Bun.file(resolvePath(directory, this.filename));
        await file.write(this.file);
        return file;
    }
}
