import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // O XML é validado em 5 MB; 6 MB preservam a margem do multipart/form-data.
    serverActions: {
      bodySizeLimit: "6mb"
    }
  }
};

export default nextConfig;
