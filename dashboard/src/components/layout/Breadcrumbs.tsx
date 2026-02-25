"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center space-x-2 text-sm text-zinc-500 dark:text-zinc-400">
      <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-500">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;

        return (
          <div key={href} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            <Link
              href={href}
              className={`capitalize transition-colors hover:text-blue-600 dark:hover:text-blue-500 ${
                isLast ? "font-semibold text-zinc-900 dark:text-white" : ""
              }`}
            >
              {segment.replace(/-/g, " ")}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
