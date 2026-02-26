"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import "./globals.css";
import { useState, useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Initialize dark mode
  useEffect(() => {
    const stored = localStorage.getItem("featurestream-settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.theme === "light") {
          document.documentElement.classList.remove("dark");
          return;
        }
      } catch {}
    }
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-slate-950 text-slate-100"
      >
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto bg-slate-900/50 px-6 py-6 lg:px-8">
                <div className="mb-4">
                  <Breadcrumbs />
                </div>
                {children}
              </main>
            </div>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
