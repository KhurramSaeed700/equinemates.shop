import type { NextConfig } from "next";

function getR2RemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "**.r2.dev",
      pathname: "/**",
    },
  ];
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!publicBaseUrl) {
    return remotePatterns;
  }

  try {
    const url = new URL(publicBaseUrl);
    const pathname =
      url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/$/, "")}/**`;

    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname,
    });
  } catch {
    return remotePatterns;
  }

  return remotePatterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getR2RemotePatterns(),
  },
};

export default nextConfig;
