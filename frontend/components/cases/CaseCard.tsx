import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import type { CaseSummary } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

const statusTone = {
  uploaded: "default",
  processing: "warning",
  completed: "success",
  failed: "destructive",
} as const;

export function CaseCard({ caseSummary }: { caseSummary: CaseSummary }) {
  return (
    <Link
      href={`/cases/${caseSummary.case_id}`}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:border-primary/40 hover:bg-card transition-colors group min-h-[44px]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
          <Layers size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{caseSummary.name}</p>
          <p className="text-xs text-text-muted mono-numeric">{formatDate(caseSummary.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge tone={statusTone[caseSummary.status]}>{caseSummary.status}</Badge>
        <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" aria-hidden="true" />
      </div>
    </Link>
  );
}
