import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QRCraft - Professional QR Codes",
  description: "Beautifully simple, highly customizable QR codes without the enterprise price tag.",
  keywords: ["QR code", "QR code generator", "custom QR code", "QRCraft", "dynamic QR code"],
  openGraph: {
    title: "QRCraft - Professional QR Codes",
    description: "Beautifully simple, highly customizable QR codes without the enterprise price tag.",
    url: "https://qrcraft.fun",
    siteName: "QRCraft",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRCraft - Professional QR Codes",
    description: "Beautifully simple, highly customizable QR codes without the enterprise price tag.",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
