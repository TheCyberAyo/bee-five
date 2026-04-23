import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/app-ads.txt",
        destination: "/public/app-ads.txt",
      },
    ];
  },
};

export default nextConfig;