import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The import page uploads a dane_planu workbook or JSON file through a Server Action (the default limit is 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
