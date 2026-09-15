import type { Metadata } from "next";
import { Fraunces, Inter_Tight, DM_Sans, Bricolage_Grotesque, Nunito } from "next/font/google";
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

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["600", "800"],
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlaso",
  description: "Create beautiful photobooks from your travel photos",
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
