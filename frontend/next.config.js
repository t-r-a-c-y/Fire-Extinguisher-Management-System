/** @type {import('next').NextConfig} */

// Where the API gateway lives. Same on any machine; override with GATEWAY_URL
// if you run the gateway on a different host/port.
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

const nextConfig = {
  reactStrictMode: true,
  // Proxy all /api/* calls to the gateway. This keeps the browser on a single
  // origin (the Next.js app), so there is no CORS/cross-origin step — which is
  // what was breaking the PDF/CSV downloads ("Failed to fetch").
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${GATEWAY_URL}/api/:path*` }];
  },
};
module.exports = nextConfig;
