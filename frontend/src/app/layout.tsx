import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Today | Adaptive Athlete",
  description: "Your training, in focus. A preview of the Adaptive Athlete workout dashboard.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#090c0b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
