import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan blok typescript dan eslint ini:
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // (Biarkan pengaturan lain yang mungkin sudah ada di bawah sini)
};

export default nextConfig;
