import type {NextConfig} from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // This is required to allow requests from cloud-based development environments
  },
  images: {
    domains: [
      'geqebteyoseuvcmpvimp.supabase.co',
      // tambahkan domain lain jika perlu
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Optimasi browser target untuk menghilangkan polyfills yang tidak perlu
  compiler: {
    // Hapus console.log di production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Target browser modern (2019+) untuk menghilangkan polyfills
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Target browser modern untuk menghilangkan polyfills
      config.target = ['web', 'es2019'];
      
      // Optimasi tersier untuk menghilangkan polyfills
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Hapus polyfills yang tidak diperlukan untuk browser modern
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
