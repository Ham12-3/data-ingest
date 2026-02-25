"use client";

import { Bell, Search, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-8 dark:bg-zinc-950">
      <div className="flex w-full max-w-md items-center gap-2 rounded-md border bg-zinc-50 px-3 py-1.5 dark:bg-zinc-900">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search features, users, or metrics..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950"></span>
        </button>
        <ThemeToggle />
        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
        <button className="flex items-center gap-2 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            JD
          </div>
        </button>
      </div>
    </header>
  );
}
