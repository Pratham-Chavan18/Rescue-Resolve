import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      try {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      } catch {
        // Safe fallback for read-only environments
      }
    }
  }

  async upload(objectPath: string, buffer: Buffer): Promise<{ path: string }> {
    const fullPath = path.join(this.uploadsDir, objectPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return { path: objectPath };
  }

  async getSignedUrl(objectPath: string): Promise<string> {
    const clean = objectPath.startsWith('/') ? objectPath : `/${objectPath}`;
    return clean.startsWith('/uploads/') ? clean : `/uploads${clean}`;
  }

  async delete(objectPath: string): Promise<void> {
    const fullPath = path.join(this.uploadsDir, objectPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err: any) {
        this.logger.warn(`Could not delete local file ${fullPath}: ${err.message}`);
      }
    }
  }
}
