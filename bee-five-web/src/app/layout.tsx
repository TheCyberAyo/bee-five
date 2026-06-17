import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../index.css";
import "../App.css";
import { AuthProvider } from "../contexts/AuthContext";
import PortraitLock from "../components/PortraitLock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bee Five - Connect Five Game",
  description: "A fun Connect Five game with bee-themed adventure mode and multiplayer features",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bee Five",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.jpg', type: 'image/jpeg', sizes: 'any' },
    ],
    shortcut: [
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [
      { url: '/icon.png', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFC30B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PortraitLock>
            {children}
          </PortraitLock>
        </AuthProvider>
      </body>
    </html>
  );
}
