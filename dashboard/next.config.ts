import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default nextConfig;
