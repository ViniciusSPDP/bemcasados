import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    proxyClientMaxBodySize: "200mb",
  },

  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9002",
        pathname: "/bem-casados-bucket/**",
      },
      {
        protocol: "http",
        hostname: "192.168.1.39", 
        port: "9002",
        pathname: "/bem-casados-bucket/**",
      },
      {
        protocol: "https",
        hostname: process.env.S3_ENDPOINT || "localhost",
        port: "9002",
        pathname: "/bem-casados-bucket/**",
      },
      {
        protocol: "https",
        hostname: "logospng.org",
        pathname: "/**",
      }
    ],
  },
};

export default nextConfig;
