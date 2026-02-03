/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Output standalone build for Docker
  output: 'standalone',
  
  // Disable image optimization for static export (if needed)
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
