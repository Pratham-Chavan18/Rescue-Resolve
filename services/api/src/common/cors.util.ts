/**
 * Production-ready CORS origin parser and validator.
 * Supports:
 * - Comma-separated list of origins in FRONTEND_URL
 * - Strips trailing slashes
 * - Always includes local development origins
 * - Non-browser requests (null/undefined origin from server-to-server, curl, mobile)
 */

export function getAllowedOrigins(): string[] {
  const envOrigins = process.env['FRONTEND_URL'];
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://rescue-resolve.vercel.app',
  ];

  if (!envOrigins) {
    return defaults;
  }

  const parsed = envOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const merged = Array.from(new Set([...defaults, ...parsed]));
  return merged;
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  // Allow non-browser requests (curl, server-to-server, mobile native)
  if (!origin) {
    return true;
  }

  const cleanOrigin = origin.replace(/\/+$/, '').toLowerCase();

  return allowedOrigins.some((allowed) => {
    return allowed.toLowerCase() === cleanOrigin;
  });
}
