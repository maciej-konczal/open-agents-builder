import path from 'path';
import fs from 'fs';

/**
 * The StorageService class now includes additional methods:
 *  - acquireLock / releaseLock for concurrency control
 *  - readPlainJSONAttachment / writePlainJSONAttachment
 *    for JSON read/write operations
 */
export class StorageService {
    private rootPath: string;
    private uploadPath: string;
    private schema: string;

    constructor(databaseIdHash: string, schema: string) {
        this.rootPath = path.resolve(process.cwd());
        this.uploadPath = path.join(this.rootPath, 'data', databaseIdHash, schema);
        this.schema = schema;
    }

    /**
     * Ensure that the target directory (uploadPath) exists.
     */
    private ensureDirExists(): void {
        if (!fs.existsSync(this.uploadPath)) {
            fs.mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    /**
     * Resolve the absolute path for a particular storage key.
     */
    private getFilePath(storageKey: string): string {
        return path.resolve(this.uploadPath, storageKey);
    }

    /**
     * Resolve the absolute path for the lock file used by concurrency.
     */
    private getLockFilePath(storageKey: string): string {
        return `${this.getFilePath(storageKey)}.lock`;
    }

    /**
     * A small delay utility for waiting between lock acquisition attempts.
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Attempt to acquire a lock for the given storage key by creating
     * a ".lock" file. If the lock file already exists, we wait until
     * it's removed, or throw an error if too many attempts have passed.
     */
    public async acquireLock(storageKey: string, maxAttempts = 50, attemptDelayMs = 100): Promise<void> {
        this.ensureDirExists();
        const lockFilePath = this.getLockFilePath(storageKey);
        let attempts = 0;

        while (fs.existsSync(lockFilePath)) {
            attempts++;
            if (attempts > maxAttempts) {
            throw new Error(`Could not acquire lock for "${storageKey}" after ${maxAttempts} attempts`);
            }
            await this.delay(attemptDelayMs);
        }

        // Create an empty lock file to signal ownership
        fs.writeFileSync(lockFilePath, '');
    }

    /**
     * Release the lock for the given storage key by removing the ".lock" file.
     */
    public releaseLock(storageKey: string): void {
        const lockFilePath = this.getLockFilePath(storageKey);
        if (fs.existsSync(lockFilePath)) {
            fs.unlinkSync(lockFilePath);
        }
    }

    /**
     * Saves a binary attachment from an in-memory 'File' object.
     * (Provided as before, no change in logic)
     */
    public async saveAttachment(file: File, storageKey: string): Promise<void> {
        this.ensureDirExists();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        fs.writeFileSync(this.getFilePath(storageKey), buffer);
    }

    /**
     * Saves an attachment from a base64 string.
     * (Provided as before, no change in logic)
     */
    public async saveAttachmentFromBase64(base64: string, storageKey: string): Promise<void> {
        this.ensureDirExists();
        const buffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(this.getFilePath(storageKey), buffer);
    }

    /**
     * Saves a plain-text attachment (UTF-8).
     * (Provided as before, no change in logic)
     */
    public async savePlainTextAttachment(text: string, storageKey: string): Promise<void> {
        this.ensureDirExists();
        fs.writeFileSync(this.getFilePath(storageKey), text, 'utf8');
    }

    /**
     * Reads a plain-text file and returns it as a string (UTF-8).
     */
    public readPlainTextAttachment(storageKey: string): string {
        const filePath = this.getFilePath(storageKey);
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Check if a file exists for the given storage key.
     */
    public fileExists(storageKey: string): boolean {
        const filePath = this.getFilePath(storageKey);
        return fs.existsSync(filePath);
    }

    /**
     * Read a binary attachment as an ArrayBuffer.
     */
    public readAttachment(storageKey: string): ArrayBuffer {
        const filePath = this.getFilePath(storageKey);
        const buffer = fs.readFileSync(filePath);
        return new Uint8Array(buffer).buffer;
    }

    /**
     * Read a binary attachment as a base64 data URI string (with mimeType).
     */
    public readAttachmentAsBase64WithMimeType(storageKey: string, mimeType: string): string {
        const filePath = this.getFilePath(storageKey);
        const buffer = fs.readFileSync(filePath).toString('base64');
        return `data:${mimeType};base64,${buffer}`; 
    }

    /**
     * Deletes an attachment for the given storage key.
     */
    public deleteAttachment(storageKey: string): void {
        fs.rmSync(this.getFilePath(storageKey));
    }

    /**
     * Reads a JSON file from disk (returning {} if it doesn't exist).
     * No concurrency logic here -- you can call acquireLock before.
     */
    public readPlainJSONAttachment<T = any>(storageKey: string): T {
        const filePath = this.getFilePath(storageKey);

        if (!fs.existsSync(filePath)) {
            return {} as T;
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as T;
    }

    /**
     * Writes data as JSON to disk. If the resulting JSON size exceeds
     * maxFileSizeMB, an error is thrown.
     */
    public writePlainJSONAttachment(storageKey: string, data: any, maxFileSizeMB = 10): void {
        this.ensureDirExists();

        const jsonString = JSON.stringify(data);
        const size = Buffer.byteLength(jsonString, 'utf8');

        if (size > maxFileSizeMB * 1024 * 1024) {
            throw new Error(
                `File size limit of ${maxFileSizeMB}MB exceeded for ${storageKey}.`
            );
        }

        fs.writeFileSync(this.getFilePath(storageKey), jsonString, 'utf8');
    }
}
