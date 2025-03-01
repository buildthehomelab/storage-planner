/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensures Next.js can work properly in Docker environments
  experimental: {
    // This is experimental but stable
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
  },
  // SWC configuration
  swcMinify: process.env.NEXT_SWC_MINIFY !== '0',
  // Fall back to Babel when SWC is not available (for ARM compatibility)
  compiler: {
    // This helps with ARM compatibility issues
    styledComponents: true
  }
}

module.exports = nextConfig
