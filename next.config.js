/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.EXPORT_MODE === 'true' ? 'export' : 'standalone',
  // For GitHub Pages deployment
  ...(process.env.EXPORT_MODE === 'true' && {
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
  }),
  // For regular Next.js deployment
  experimental: {
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
  },
}

module.exports = nextConfig
