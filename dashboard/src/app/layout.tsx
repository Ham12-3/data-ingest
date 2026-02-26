import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Providers } from "@/components/Providers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeatureStream — ML Pipeline Dashboard",
  description:
    "Real-time monitoring and management for Kafka, Flink, Feast, and Great Expectations pipelines.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <Header />
              <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
                <div className="mb-4">
                  <Breadcrumbs />
                </div>
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
