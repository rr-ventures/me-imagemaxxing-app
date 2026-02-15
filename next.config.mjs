/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "better-sqlite3", "@prisma/client"],
  },
};

export default nextConfig;
