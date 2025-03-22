const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['via.placeholder.com', 'sketch-design.ma', 'docs.google.com','i.imgur.com', 'ratio.sketchdesign.ma'],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"]
    });
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  transpilePackages: ['lucide-react', '@radix-ui/react-select', '@radix-ui/react-dialog'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/stock-finder',
        destination: '/stock-finder',
        has: [
          {
            type: 'header',
            key: 'x-custom-page',
            value: 'stock-finder',
          },
        ],
      },
      {
        source: '/stock-index',
        destination: '/stock-index',
        has: [
          {
            type: 'header',
            key: 'x-custom-page',
            value: 'stock-index',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
