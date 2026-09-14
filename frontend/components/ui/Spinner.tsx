import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ size = 20, className, label = "Loading" }: { size?: number; className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-text-muted", className)} role="status">
      <Loader2 size={size} className="animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
