import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <Icon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div>
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 rounded-md bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
