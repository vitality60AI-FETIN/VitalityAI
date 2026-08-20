import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita bundler errors de módulos CommonJS/ESM do firebase-admin na Vercel
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
