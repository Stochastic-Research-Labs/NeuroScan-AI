import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mono-numeric text-2xl font-semibold text-text mt-1">{value}</p>
        {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
      </div>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1",
          accent ?? "bg-primary/10 text-primary ring-primary/30"
        )}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
    </div>
  );
}
