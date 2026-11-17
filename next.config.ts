import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // The page was /import-eksport while it also exported data; old links and bookmarks still land on it.
    return [{ source: "/import-eksport", destination: "/import", permanent: true }];
  },
};

export default nextConfig;
