/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  // Skip static optimization for pages using Wagmi
  skipTrailingSlashRedirect: true,
  webpack: (config, { isServer }) => {
    // Ignore React Native and optional dependencies not needed in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      lokijs: false,
      encoding: false,
    }

    // Ignore specific modules that are not needed
    config.externals.push({
      'pino-pretty': 'pino-pretty',
      lokijs: 'lokijs',
      encoding: 'encoding',
    })

    return config
  },
}

module.exports = nextConfig
