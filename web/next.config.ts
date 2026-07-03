import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.daregamesapp.com' }],
        destination: 'https://daregamesapp.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
