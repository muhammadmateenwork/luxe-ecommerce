import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUXE - Premium Fashion Store",
  description: "Discover curated collections of premium fashion. Shop men's, women's, kids' clothing, shoes, and accessories at LUXE.",
  keywords: ["LUXE", "fashion", "clothing", "premium", "designer", "online store"],
  authors: [{ name: "LUXE" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LUXE - Premium Fashion Store",
    description: "Discover curated collections of premium fashion at LUXE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LUXE - Premium Fashion Store",
    description: "Discover curated collections of premium fashion at LUXE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
