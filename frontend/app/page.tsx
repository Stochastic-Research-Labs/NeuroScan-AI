import { Brain, Upload, ScanEye, LineChart, ArrowRight, Layers3, ShieldCheck, Database } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { BackendStatusCard } from "@/components/dashboard/BackendStatusCard";
import { CaseList } from "@/components/dashboard/CaseList";
import { StatCard } from "@/components/ui/StatCard";

const PIPELINE = [
  {
    icon: Upload,
    title: "Upload a case",
    description: "Drop a patient's T1, T1-CE, T2, and FLAIR NIfTI scans, or a zipped case folder.",
  },
  {
    icon: Layers3,
    title: "Preprocess & segment",
    description:
      "The backend normalizes each modality and runs the 3D U-Net to predict tumor sub-regions.",
  },
  {
    icon: ScanEye,
    title: "Explore in 3D",
    description: "Scroll through axial, coronal, and sagittal slices with the segmentation overlay.",
  },
  {
    icon: LineChart,
    title: "Review metrics",
    description: "Check per-class Dice scores and volumes once your Kaggle-trained model is loaded.",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <section className="clinical-grid overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="animate-fade-in">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
                <Brain size={14} aria-hidden="true" /> MRI analysis workspace
              </span>
              <span className="text-text-muted">BraTS 2021 · local processing</span>
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-[3.4rem] lg:leading-[1.06]">
              Bring clarity to every brain MRI study.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
              Prepare four MRI modalities, run segmentation, then inspect tumor regions in an interactive 3D workspace. Your images and model stay on this machine.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/upload" size="lg">
                Start new analysis <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/about" size="lg" variant="secondary">Review workflow</ButtonLink>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-white/90 p-5 shadow-card" aria-label="Analysis workflow summary">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Analysis protocol</p>
            <ol className="mt-4 space-y-4">
              {[
                ["01", "Prepare", "T1, T1-CE, T2 and FLAIR"],
                ["02", "Segment", "3D U-Net inference"],
                ["03", "Review", "Overlay, volumes and report"],
              ].map(([step, title, detail], index) => (
                <li key={step} className="flex gap-3">
                  <span className="mono-numeric flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{step}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{title}</p>
                    <p className="text-xs leading-relaxed text-text-muted">{detail}</p>
                  </div>
                  {index < 2 && <span className="sr-only">then</span>}
                </li>
              ))}
            </ol>
          </aside>
        </div>
        <div className="grid border-t border-border bg-surface/70 sm:grid-cols-3">
          <div className="flex items-center gap-3 px-6 py-4 text-sm text-text-muted"><ShieldCheck size={18} className="text-success" aria-hidden="true" /> Local-first data handling</div>
          <div className="flex items-center gap-3 border-t border-border px-6 py-4 text-sm text-text-muted sm:border-l sm:border-t-0"><Database size={18} className="text-primary" aria-hidden="true" /> NIfTI-ready imaging workflow</div>
          <div className="flex items-center gap-3 border-t border-border px-6 py-4 text-sm text-text-muted sm:border-l sm:border-t-0"><Layers3 size={18} className="text-primary" aria-hidden="true" /> 3 tumor sub-regions</div>
        </div>
      </section>

      <BackendStatusCard />

      <section aria-labelledby="pipeline-heading">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">At a glance</p><h2 id="pipeline-heading" className="mt-1 text-xl font-semibold text-text">A focused clinical-research workflow</h2></div></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="mono-numeric text-xs font-semibold text-text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-text">{title}</h3>
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <CaseList />
    </div>
  );
}
