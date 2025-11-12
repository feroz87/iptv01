import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'yts.mx',
      },
      {
        protocol: 'https',
        hostname: '**.yts.mx',
      },
      {
        protocol: 'https',
        hostname: 'filmplus.app',
      },
      {
        protocol: 'https',
        hostname: 'www.filmplus.app',
      },
      {
        protocol: 'https',
        hostname: '**.filmplus.app',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // WebTorrent needs polyfills for browser environment
    if (!isServer) {
      // Provide global as globalThis for WebTorrent
      config.plugins.push(
        new webpack.ProvidePlugin({
          global: 'globalThis',
          Buffer: ['buffer', 'Buffer'],
        })
      );
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: require.resolve('buffer'),
      };
    } else {
      // Server-side: Ignore native modules that can't be bundled
      config.resolve.alias = {
        ...config.resolve.alias,
        'utp-native': false,
        'fs-native-extensions': false,
        'require-addon': false,
      };
      
      // Use IgnorePlugin to completely ignore native modules
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(fs-native-extensions|require-addon|utp-native)$/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;

