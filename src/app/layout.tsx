import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | ReliefConnect",
    default: "ReliefConnect | Hyperlocal Disaster Response",
  },
  description: "Real-time disaster coordination and emergency rescue mapping for victims and volunteers.",
  manifest: "/manifest.json",
  keywords: ["disaster response", "emergency", "volunteer", "relief connect", "SOS", "crisis coordination"],
  openGraph: {
    title: "ReliefConnect | Hyperlocal Disaster Response",
    description: "Real-time disaster coordination and emergency rescue mapping for victims and volunteers.",
    siteName: "ReliefConnect",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReliefConnect | Hyperlocal Disaster Response",
    description: "Real-time disaster coordination and emergency rescue mapping for victims and volunteers.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[color:var(--background)] text-[color:var(--foreground)] transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
