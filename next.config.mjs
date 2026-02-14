/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "better-sqlite3"],
  },
};

export default nextConfig;
