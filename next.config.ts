import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      {
        protocol: "https",
        hostname: 'placehold.co'
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: '9002',
        pathname: '/bem-casados-bucket/**',
      },
    ]
  } 
}

export default nextConfig;
