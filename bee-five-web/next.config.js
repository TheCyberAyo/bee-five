/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/app-ads.txt",
        destination: "/public/app-ads.txt",
      },
    ];
  },
};

module.exports = nextConfig;