import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/suppressTFLiteLog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Vision Pro — Smart Face Detection & Auto-Tracking",
  description:
    "Professional AI-powered real-time face detection, tracking, and expression analysis system with premium dashboard interface.",
  keywords: ["face detection", "AI camera", "face tracking", "computer vision", "mediapipe"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
