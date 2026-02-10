import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@tremor/react', 'recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
