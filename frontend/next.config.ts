import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const webpack = require("webpack");

const nextConfig: NextConfig = {
  // Smaller production bundle for Azure App Service / Docker
  output: "standalone",
  eslint: {
    // Pre-existing lint warnings should not block production deploys
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
    // Hosts allowed to embed tenant pages in an iframe (the admin settings
    // live preview). Must cover the deployed main domain and its subdomains.
    const mainDomain =
      process.env.NEXT_PUBLIC_MAIN_DOMAIN || "teslaacademy.dedyn.io";
    const frameAncestors = Array.from(
      new Set([
        "'self'",
        "http://localhost:3000",
        "http://*.localhost:3000",
        "https://teslaacademy.com",
        "https://www.teslaacademy.com",
        "https://*.teslaacademy.com",
        "https://*.teslaacademy.in",
        `https://${mainDomain}`,
        `https://*.${mainDomain}`,
      ])
    ).join(" ");

    const sharedSecurityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
    ];

    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          ...sharedSecurityHeaders,
        ],
      },
      {
        source: "/teacher/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          ...sharedSecurityHeaders,
        ],
      },
      {
        source: "/login",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          ...sharedSecurityHeaders,
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
          ...sharedSecurityHeaders,
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

