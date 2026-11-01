import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage.interface';

@Injectable()
export class SupabaseStorageService implements StorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(supabaseUrl: string, serviceRoleKey: string, bucket = 'recovery-evidence') {
    this.bucket = bucket;
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await this.client.storage.listBuckets();
      if (listError) {
        this.logger.warn(`Could not list Supabase buckets: ${listError.message}`);
        return;
      }

      const exists = buckets?.some((b) => b.name === this.bucket);
      if (!exists) {
        const { error: createError } = await this.client.storage.createBucket(this.bucket, {
          public: false,
          fileSizeLimit: 2097152, // 2 MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
        if (createError) {
          this.logger.warn(
            `Could not auto-create private bucket "${this.bucket}": ${createError.message}. ` +
            `Please ensure it is created in the Supabase dashboard.`,
          );
        } else {
          this.logger.log(`Created private Supabase bucket: ${this.bucket}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Supabase bucket initialization error: ${err.message}`);
    }
  }

  private sanitizePath(objectPath: string): string {
    const sanitized = objectPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = sanitized.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
      throw new Error('Invalid storage path: path traversal detected');
    }
    if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(sanitized)) {
      throw new Error('Invalid storage path: illegal characters');
    }
    return sanitized;
  }

  async upload(objectPath: string, buffer: Buffer, mimetype: string): Promise<{ path: string }> {
    const safePath = this.sanitizePath(objectPath);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(safePath, buffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Supabase upload error for path "${safePath}": ${error.message}`);
      throw new Error(`Failed to upload evidence to Supabase Storage: ${error.message}`);
    }

    return { path: data.path };
  }

  async getSignedUrl(objectPath: string, expiresInSeconds = 3600): Promise<string> {
    const safePath = this.sanitizePath(objectPath);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(safePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      this.logger.error(`Failed to generate signed URL for "${safePath}": ${error?.message}`);
      throw new Error(`Failed to generate signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async delete(objectPath: string): Promise<void> {
    const safePath = this.sanitizePath(objectPath);
    const { error } = await this.client.storage.from(this.bucket).remove([safePath]);
    if (error) {
      this.logger.warn(`Failed to delete storage object "${safePath}": ${error.message}`);
    }
  }
}
