/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Use 'basePath' if you're not hosting at the root of your domain
  // basePath: '/storage-planner',
  // Use 'images.unoptimized' for static export
  images: {
    unoptimized: true,
  },
  // GitHub Pages adds a trailing slash by default
  trailingSlash: true,
}

module.exports = nextConfig
