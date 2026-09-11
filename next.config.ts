import type { NextConfig } from "next";

// Backend origin for the /api rewrite. Set NEXT_PUBLIC_API_URL in the
// deployment environment (e.g. the Railway backend URL); falls back to the
// local backend for development.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "@resvg/resvg-js-darwin-arm64"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
