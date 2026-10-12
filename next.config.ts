import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // pdf-parse uses pdfjs-dist which cannot be bundled by webpack
  serverExternalPackages: ["pdf-parse"],
  // Allow the sandbox preview gateway domain to load /_next/* assets without
  // the "Cross origin request detected" dev warning (Next.js 16+).
  allowedDevOrigins: [
    "*.space-z.ai",
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.18.10:3000",
  ],
};

export default nextConfig;
