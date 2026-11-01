import { describe, it, expect } from 'vitest';
import {
  extractDatabaseHost,
  maskHost,
  isLocalhostHost,
  validateSeedTarget,
} from './seed-guard.util';

describe('Seed Guard Utility', () => {
  describe('extractDatabaseHost', () => {
    it('extracts host from standard postgres URL', () => {
      const url = 'postgresql://postgres:secret@localhost:5432/swiggy_recovery';
      expect(extractDatabaseHost(url)).toBe('localhost');
    });

    it('extracts host from Supabase pooler URL with special characters in password', () => {
      const url = 'postgresql://postgres.project:pass%40123@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';
      expect(extractDatabaseHost(url)).toBe('aws-1-eu-west-3.pooler.supabase.com');
    });

    it('returns empty string when URL is empty', () => {
      expect(extractDatabaseHost('')).toBe('');
    });
  });

  describe('maskHost', () => {
    it('preserves localhost targets unchanged for clarity', () => {
      expect(maskHost('localhost')).toBe('localhost');
      expect(maskHost('127.0.0.1')).toBe('127.0.0.1');
    });

    it('masks remote database domain prefixes without leaking full details', () => {
      const masked = maskHost('aws-1-eu-west-3.pooler.supabase.com');
      expect(masked).toBe('aw***.pooler.supabase.com');
      expect(masked).not.toContain('aws-1-eu-west-3');
    });
  });

  describe('isLocalhostHost', () => {
    it('identifies localhost addresses', () => {
      expect(isLocalhostHost('localhost')).toBe(true);
      expect(isLocalhostHost('127.0.0.1')).toBe(true);
      expect(isLocalhostHost('::1')).toBe(true);
      expect(isLocalhostHost('0.0.0.0')).toBe(true);
    });

    it('identifies non-localhost remote addresses', () => {
      expect(isLocalhostHost('aws-1-eu-west-3.pooler.supabase.com')).toBe(false);
      expect(isLocalhostHost('db.example.com')).toBe(false);
    });
  });

  describe('validateSeedTarget', () => {
    it('throws error when DATABASE_URL is missing', () => {
      expect(() => validateSeedTarget({})).toThrow('DATABASE_URL environment variable is not defined.');
    });

    it('allows local development database without special flags', () => {
      const env = {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/swiggy_recovery',
      };
      const result = validateSeedTarget(env);
      expect(result.isProduction).toBe(false);
      expect(result.targetHost).toBe('localhost');
      expect(result.maskedHost).toBe('localhost');
    });

    it('refuses production seed when CONFIRM_PRODUCTION_SEED is missing', () => {
      const env = {
        DATABASE_URL: 'postgresql://postgres.xxx:pass%40123@aws-1-eu-west-3.pooler.supabase.com:5432/postgres',
        SEED_TARGET: 'production',
      };
      expect(() => validateSeedTarget(env)).toThrow(
        'Production seeding aborted: CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA is required when SEED_TARGET=production.',
      );
    });

    it('refuses production seed when CONFIRM_PRODUCTION_SEED has wrong value', () => {
      const env = {
        DATABASE_URL: 'postgresql://postgres.xxx:pass%40123@aws-1-eu-west-3.pooler.supabase.com:5432/postgres',
        SEED_TARGET: 'production',
        CONFIRM_PRODUCTION_SEED: 'YES',
      };
      expect(() => validateSeedTarget(env)).toThrow(
        'Production seeding aborted: CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA is required when SEED_TARGET=production.',
      );
    });

    it('refuses production seed when target host is localhost', () => {
      const env = {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/swiggy_recovery',
        SEED_TARGET: 'production',
        CONFIRM_PRODUCTION_SEED: 'YES_SEED_DEMO_DATA',
      };
      expect(() => validateSeedTarget(env)).toThrow(
        "Production seeding rejected: SEED_TARGET is 'production' but database host is localhost/loopback (localhost).",
      );
    });

    it('refuses ambiguous seeding against remote database without SEED_TARGET=production', () => {
      const env = {
        DATABASE_URL: 'postgresql://postgres.xxx:pass%40123@aws-1-eu-west-3.pooler.supabase.com:5432/postgres',
      };
      expect(() => validateSeedTarget(env)).toThrow(
        'Remote database target detected (aw***.pooler.supabase.com). To seed a remote/production database, you must explicitly set SEED_TARGET=production and CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA.',
      );
    });

    it('successfully validates production seed when explicitly confirmed against remote database', () => {
      const env = {
        DATABASE_URL: 'postgresql://postgres.xxx:pass%40123@aws-1-eu-west-3.pooler.supabase.com:5432/postgres',
        SEED_TARGET: 'production',
        CONFIRM_PRODUCTION_SEED: 'YES_SEED_DEMO_DATA',
      };
      const result = validateSeedTarget(env);
      expect(result.isProduction).toBe(true);
      expect(result.targetHost).toBe('aws-1-eu-west-3.pooler.supabase.com');
      expect(result.maskedHost).toBe('aw***.pooler.supabase.com');
    });
  });
});
