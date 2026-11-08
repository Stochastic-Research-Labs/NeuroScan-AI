import { ArrowUpRight, Layers3, ScanLine } from "lucide-react";
import { BackendStatusCard } from "@/components/dashboard/BackendStatusCard";
import { CaseList } from "@/components/dashboard/CaseList";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Research workspace — NeuroScan AI", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <div className="page-shell space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div><p className="eyebrow">Your research workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A clearer view of every case.</h1><p className="mt-3 max-w-xl text-sm leading-7 text-text-muted">Prepare a study, explore its segmentation, and keep your findings together.</p></div>
      <ButtonLink href="/upload">New analysis <ArrowUpRight size={18} aria-hidden="true" /></ButtonLink>
    </div>
    <BackendStatusCard />
    <CaseList />
    <div className="grid gap-5 md:grid-cols-2">
      <div className="glass-panel p-6"><Layers3 className="text-primary" size={22} aria-hidden="true" /><h2 className="mt-4 font-medium">Four perspectives. One study.</h2><p className="mt-2 text-sm leading-7 text-text-muted">Each case requires aligned T1, T1-CE, T2 and FLAIR volumes. Use preprocessed BraTS-style MRI data.</p></div>
      <div className="glass-panel p-6"><ScanLine className="text-primary" size={22} aria-hidden="true" /><h2 className="mt-4 font-medium">Predictions need interpretation.</h2><p className="mt-2 text-sm leading-7 text-text-muted">Inspect the original scan alongside the overlay. Predicted volumes are not a diagnosis or a per-case accuracy score.</p></div>
    </div>
    <p className="text-xs leading-6 text-text-muted">Research prototype · Not validated for clinical diagnosis or treatment decisions.</p>
  </div>;
}
