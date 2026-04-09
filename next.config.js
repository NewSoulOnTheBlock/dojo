const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Polyfill Buffer and process for Solana SDK in browser
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
      }
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      )
    }

    // Strip source maps in production
    if (!dev) {
      config.devtool = false
    }

    return config
  },
  // Remove x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
