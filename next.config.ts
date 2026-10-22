import type { NextConfig } from "next";

// Every page in this app reads the signed-in user, so pages render per request.
// Cache Components is left off to keep auth reads simple.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
