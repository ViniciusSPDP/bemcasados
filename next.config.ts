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
    hostname: "minio.s4r41va.com",
    pathname: "/bem-casados-bucket/**",
  }
    ],
  },
};

export default nextConfig;
