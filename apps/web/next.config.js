/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@swiggy/types', '@swiggy/engines'],
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
