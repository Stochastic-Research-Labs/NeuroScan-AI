import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border-strong py-16 px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30 mb-4">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="text-sm text-text-muted mt-1.5 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
