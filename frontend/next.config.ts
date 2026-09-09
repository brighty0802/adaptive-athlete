import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Binding to 0.0.0.0 does not allow the browser's LAN origin for dev assets.
  // localhost remains allowed by Next.js; add only this laptop's Wi-Fi address.
  allowedDevOrigins: ["192.168.1.106"],
};

export default nextConfig;
