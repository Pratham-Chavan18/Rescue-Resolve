export interface StorageService {
  upload(objectPath: string, buffer: Buffer, mimetype: string): Promise<{ path: string }>;
  getSignedUrl(objectPath: string, expiresInSeconds?: number): Promise<string>;
  delete(objectPath: string): Promise<void>;
}
