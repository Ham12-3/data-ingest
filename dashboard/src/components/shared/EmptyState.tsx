import { cn } from "@/lib/utils";
import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}>
      <div className="rounded-full bg-slate-800 p-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
