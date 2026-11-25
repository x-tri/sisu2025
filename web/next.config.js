/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Output standalone build for Docker
  output: 'standalone',

  // Fonts and logo are read from disk at runtime, which the standalone tracer cannot see.
  experimental: {
    outputFileTracingIncludes: {
      '/**/opengraph-image*': ['./assets/**/*'],
    },
  },
  
  // Disable image optimization for static export (if needed)
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
}

module.exports = nextConfig
