import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "better-sqlite3"],
  },
};

export default nextConfig;
