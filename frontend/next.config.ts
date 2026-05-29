import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const webpack = require("webpack");

const nextConfig: NextConfig = {
  // Explicitly set the tracing root to this workspace to avoid
  // lockfile root detection warnings when multiple lockfiles exist
  outputFileTracingRoot: __dirname,
  images: {
    domains: [
      "quezt-learn-lms.vercel.app",
      "images.unsplash.com",
      "d2qbkdyhv7dt4j.cloudfront.net",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.teslaacademy.com",
      },
      {
        protocol: "https",
        hostname: "dtuwpxowphgheawltcmu.supabase.co",
      },
    ],
  },
  // Configure to handle subdomains
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Fix for pdfjs-dist trying to import Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false,
    };

    // Ignore canvas imports completely
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^canvas$/,
        contextRegExp: /pdfjs-dist/,
      })
    );

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
