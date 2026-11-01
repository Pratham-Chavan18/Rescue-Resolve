import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.interface';
import { SupabaseStorageService } from './supabase-storage.service';
import { LocalStorageService } from './local-storage.service';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (): StorageService => {
        const supabaseUrl = process.env['SUPABASE_URL'];
        const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        const bucket = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'recovery-evidence';

        if (supabaseUrl && serviceRoleKey) {
          return new SupabaseStorageService(supabaseUrl, serviceRoleKey, bucket);
        }

        return new LocalStorageService();
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
