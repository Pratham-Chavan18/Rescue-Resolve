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

  private getSafeFullPath(objectPath: string): string {
    const sanitized = objectPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = sanitized.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
      throw new Error('Invalid storage path: path traversal detected');
    }
    if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(sanitized)) {
      throw new Error('Invalid storage path: illegal characters');
    }

    const baseDir = path.resolve(this.uploadsDir);
    const resolved = path.resolve(baseDir, sanitized);
    if (!resolved.startsWith(baseDir + path.sep)) {
      throw new Error('Invalid storage path: path traversal detected');
    }
    return resolved;
  }

  async upload(objectPath: string, buffer: Buffer): Promise<{ path: string }> {
    const safePath = this.getSafeFullPath(objectPath);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, buffer);
    return { path: objectPath.replace(/\\/g, '/').replace(/^\/+/, '') };
  }

  async getSignedUrl(objectPath: string): Promise<string> {
    const sanitized = objectPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (sanitized.includes('..')) {
      throw new Error('Invalid storage path: path traversal detected');
    }
    return `/uploads/${sanitized}`;
  }

  async delete(objectPath: string): Promise<void> {
    const safePath = this.getSafeFullPath(objectPath);
    if (fs.existsSync(safePath)) {
      try {
        fs.unlinkSync(safePath);
      } catch (err: any) {
        this.logger.warn(`Could not delete local file ${safePath}: ${err.message}`);
      }
    }
  }
}
