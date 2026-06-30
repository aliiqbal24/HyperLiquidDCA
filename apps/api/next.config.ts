import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const corsHeaders = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "authorization,content-type,x-hypedca-account" },
    ];

    return [
      {
        source: "/api/:path*",
        headers: corsHeaders,
      },
      {
        source: "/v1/:path*",
        headers: corsHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
