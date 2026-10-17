import type { NextConfig } from "next";

// cacheComponents is off on purpose: with it, every cookies() read outside <Suspense>
// is a build error, and almost every page here reads the session.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
