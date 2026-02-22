import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@netk/auth",
    "@netk/database",
    "@netk/themes",
    "@netk/types",
    "@netk/ui",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.evetech.net",
      },
    ],
  },
};

export default nextConfig;
