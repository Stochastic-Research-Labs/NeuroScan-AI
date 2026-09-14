import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "destructive" | "primary";

const toneClasses: Record<Tone, string> = {
  default: "bg-border/40 text-text-muted",
  success: "bg-success/10 text-success ring-1 ring-success/30",
  warning: "bg-warning/10 text-warning ring-1 ring-warning/30",
  destructive: "bg-destructive/10 text-destructive ring-1 ring-destructive/30",
  primary: "bg-primary/10 text-primary ring-1 ring-primary/30",
};

export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
