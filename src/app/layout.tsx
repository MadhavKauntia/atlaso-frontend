import type { Metadata } from "next";
import { Fraunces, Inter_Tight, DM_Sans, Nunito } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import GoogleAuthProvider from "@/components/GoogleAuthProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "600", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Self-hosted: Google Fonts now serves Bricolage via a URL that Next's Turbopack font
// loader can't parse on Vercel builds. Variable weight file (Fontsource, OFL).
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["600", "800"],
  display: "swap",
});

const title = "Atlaso";
const description = "Create beautiful photobooks from your travel photos";

export const metadata: Metadata = {
  metadataBase: new URL("https://myatlaso.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://myatlaso.com",
    siteName: "Atlaso",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Atlaso",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${interTight.variable} ${dmSans.variable} ${bricolage.variable} ${nunito.variable} antialiased`}>
        <GoogleAuthProvider>
          {children}
        </GoogleAuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
