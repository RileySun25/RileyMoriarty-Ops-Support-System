/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
  },
  output: 'standalone',
};

export default nextConfig;
