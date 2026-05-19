/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@trainlens/shared', '@trainlens/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
