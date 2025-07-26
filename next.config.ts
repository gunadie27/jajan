import type {NextConfig} from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Disable ESLint dan TypeScript check untuk build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Compression untuk production
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Optimasi images
  images: {
    domains: [
      'geqebteyoseuvcmpvimp.supabase.co',
      'placehold.co', // Added placehold.co to domains
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Remove console in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Target browser modern untuk menghilangkan polyfills
      config.target = ['web', 'es2022'];
      
      // Optimasi tersier untuk menghilangkan polyfills
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Hapus polyfills yang tidak diperlukan untuk browser modern
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        path: false,
        fs: false,
        os: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        assert: false,
        constants: false,
        domain: false,
        events: false,
        punycode: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        vm: false,
      };
      
      // Optimasi tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Minimize bundle size
      config.optimization.minimize = true;
      
      // Hapus polyfills yang tidak diperlukan untuk browser modern
      config.module.rules.push({
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '90',
                  firefox: '88',
                  safari: '14',
                  edge: '90'
                },
                useBuiltIns: 'usage',
                corejs: false, // Tidak gunakan polyfills
                modules: false
              }]
            ],
            plugins: [
              ['@babel/plugin-transform-runtime', {
                corejs: false,
                helpers: true,
                regenerator: false
              }]
            ]
          }
        }
      });
    }
    return config;
  },
  
  // Headers untuk caching di production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
