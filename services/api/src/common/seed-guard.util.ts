/**
 * Production Seeding Protection Guard.
 *
 * Ensures demo seeding in production is strictly intentional, verified,
 * and cannot accidentally overwrite or corrupt environments.
 */

export interface SeedTargetValidation {
  isProduction: boolean;
  targetHost: string;
  maskedHost: string;
}

export function extractDatabaseHost(databaseUrl: string): string {
  if (!databaseUrl) return '';
  try {
    // Robust extraction: regex match host after @ and before : or / or ?
    const match = databaseUrl.match(/@([^/:?#]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const parsed = new URL(databaseUrl.replace(/^postgres(ql)?:\/\//, 'http://'));
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

export function maskHost(host: string): string {
  if (!host) return 'unknown';
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return host;
  }
  const parts = host.split('.');
  if (parts.length > 2) {
    const first = parts[0] ?? '';
    const masked = first.length > 3 ? `${first.slice(0, 2)}***` : '***';
    return [masked, ...parts.slice(1)].join('.');
  }
  return host;
}

export function isLocalhostHost(host: string): boolean {
  const lower = (host || '').toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local')
  );
}

export function validateSeedTarget(env: NodeJS.ProcessEnv = process.env): SeedTargetValidation {
  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  const host = extractDatabaseHost(databaseUrl);
  const isLocal = isLocalhostHost(host);
  const maskedHost = maskHost(host);

  const seedTarget = (env['SEED_TARGET'] || '').trim().toLowerCase();
  const confirmProd = (env['CONFIRM_PRODUCTION_SEED'] || '').trim();

  if (seedTarget === 'production') {
    if (confirmProd !== 'YES_SEED_DEMO_DATA') {
      throw new Error(
        'Production seeding aborted: CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA is required when SEED_TARGET=production.',
      );
    }
    if (isLocal) {
      throw new Error(
        `Production seeding rejected: SEED_TARGET is 'production' but database host is localhost/loopback (${host}).`,
      );
    }
    return {
      isProduction: true,
      targetHost: host,
      maskedHost,
    };
  }

  // Ambiguous guard: If connecting to a remote host without explicitly declaring SEED_TARGET=production
  if (!isLocal && seedTarget !== 'local') {
    throw new Error(
      `Remote database target detected (${maskedHost}). To seed a remote/production database, you must explicitly set SEED_TARGET=production and CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA.`,
    );
  }

  return {
    isProduction: false,
    targetHost: host,
    maskedHost,
  };
}
