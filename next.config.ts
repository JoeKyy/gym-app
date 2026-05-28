import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // publicExcludes uses fast-glob negation patterns against the public/ directory
  // This is the correct way to exclude static public assets from precaching
  publicExcludes: [
    "!noprecache/**/*",
    "!data/media/bodymaps/**",
    "!data/media/videos/**",
    "!data/media/images/**",
  ],
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\/data\/exercises\.json/,
        handler: "CacheFirst",
        options: {
          cacheName: "exercise-data",
          expiration: { maxEntries: 1, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // Bodymap images: cache on first use, keep the 200 most recently viewed
      {
        urlPattern: /\/data\/media\/bodymaps\/.+\.png$/,
        handler: "CacheFirst",
        options: {
          cacheName: "bodymaps",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/data\/media\/images\/.+\.jpg$/,
        handler: "CacheFirst",
        options: {
          cacheName: "exercise-images",
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/data\/media\/videos\/.+\.mp4$/,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {},
};

export default withPWA(nextConfig);
