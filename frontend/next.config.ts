import type { NextConfig } from "next";
import { getBackendBaseUrl } from "./src/lib/backend-health";

// Reject an unusable Vercel deployment before publishing its browser bundle.
// Local next dev/typecheck/build commands do not require production credentials.
if (process.env.VERCEL === "1") {
  getBackendBaseUrl("https://build.invalid", process.env.NEXT_PUBLIC_API_BASE_URL, "production");
}

const nextConfig: NextConfig = {
  // Binding to 0.0.0.0 does not allow the browser's LAN origin for dev assets.
  // localhost remains allowed by Next.js; add only this laptop's Wi-Fi address.
  allowedDevOrigins: ["192.168.1.106"],
};

export default nextConfig;
