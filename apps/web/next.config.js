/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@swiggy/types', '@swiggy/engines'],
  experimental: {
    typedRoutes: false,
  },
  async redirects() {
    return [
      {
        source: '/partner/restaurant/:subpage',
        destination: '/partner/restaurant?tab=:subpage',
        permanent: false,
      },
      {
        source: '/partner/rider/:subpage',
        destination: '/partner/rider?tab=:subpage',
        permanent: false,
      },
      {
        source: '/agent/cases',
        destination: '/agent?tab=cases',
        permanent: false,
      },
      {
        source: '/agent/escalated',
        destination: '/agent?tab=escalated',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
