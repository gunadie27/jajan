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
    // Optimasi image loading
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // Optimasi browser target untuk menghilangkan polyfills yang tidak perlu
  compiler: {
    // Hapus console.log di production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Target browser modern (2022+) untuk menghilangkan polyfills
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
      
      // Optimasi chunk splitting untuk mengurangi chain requests
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
          // Pisahkan library besar
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15,
          },
        },
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
                corejs: false, // Tidak gunakan core-js polyfills
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
};

export default withBundleAnalyzer(nextConfig);
