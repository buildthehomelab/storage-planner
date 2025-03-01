/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.EXPORT_MODE === 'true' ? 'export' : 'standalone',
  
  // For GitHub Pages deployment
  ...(process.env.EXPORT_MODE === 'true' && {
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
    
    // Add a basePath equal to your repository name (only needed for project pages)
    // Remove this line if you're deploying to a custom domain or using username.github.io repository
    basePath: '/storage-planner',
    
    // This ensures assets are loaded from the correct path in GitHub Pages
    assetPrefix: '/storage-planner/',
  }),
  
  // For regular Next.js deployment
  experimental: {
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
  },
}

module.exports = nextConfig
