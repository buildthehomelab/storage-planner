/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensures Next.js can work properly in Docker environments
  experimental: {
    // This is experimental but stable
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
  },
}

module.exports = nextConfig
