import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
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
  // Images don't need optimization for static export
  images: { unoptimized: true },
};

export default withPWA(nextConfig);
