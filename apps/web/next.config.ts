import type { NextConfig } from "next";
import "@workspace/env/web";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/api",
    "@workspace/env",
    "@workspace/panel-ui",
    "@workspace/seo-rules",
  ],
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    // Enable filesystem caching for `next dev`
    turbopackFileSystemCacheForDev: true,
    // Enable filesystem caching for `next build`
    turbopackFileSystemCacheForBuild: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
