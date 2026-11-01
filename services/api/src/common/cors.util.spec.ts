import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAllowedOrigins, isOriginAllowed } from './cors.util';

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('includes production Vercel origin and localhost by default', () => {
    delete process.env['FRONTEND_URL'];
    const allowed = getAllowedOrigins();

    expect(allowed).toContain('https://rescue-resolve.vercel.app');
    expect(allowed).toContain('http://localhost:3000');
    expect(allowed).toContain('http://127.0.0.1:3000');
  });

  it('merges custom FRONTEND_URL environment origins with defaults', () => {
    process.env['FRONTEND_URL'] = 'https://custom-domain.com, https://preview.vercel.app/';
    const allowed = getAllowedOrigins();

    expect(allowed).toContain('https://rescue-resolve.vercel.app');
    expect(allowed).toContain('https://custom-domain.com');
    expect(allowed).toContain('https://preview.vercel.app'); // Trailing slash stripped
  });

  it('accepts requests from exact Vercel production origin', () => {
    const allowed = getAllowedOrigins();
    expect(isOriginAllowed('https://rescue-resolve.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('https://rescue-resolve.vercel.app/', allowed)).toBe(true);
  });

  it('accepts requests from localhost origins', () => {
    const allowed = getAllowedOrigins();
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:3000', allowed)).toBe(true);
  });

  it('permits non-browser requests where origin is null or undefined', () => {
    const allowed = getAllowedOrigins();
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('', allowed)).toBe(true);
  });

  it('rejects unauthorized or malicious origins', () => {
    const allowed = getAllowedOrigins();
    expect(isOriginAllowed('https://malicious-site.com', allowed)).toBe(false);
    expect(isOriginAllowed('https://rescue-resolve.attacker.com', allowed)).toBe(false);
    expect(isOriginAllowed('http://fake-swiggy.com', allowed)).toBe(false);
  });
});
