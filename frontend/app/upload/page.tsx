import { ArrowLeft, Check, Info, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { UploadDropzone } from "@/components/upload/UploadDropzone";

export const metadata = { title: "New analysis — NeuroScan AI", robots: { index: false, follow: false } };

export default function UploadPage() {
  return <div className="page-shell">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-xs text-text-muted hover:text-primary"><ArrowLeft size={15} aria-hidden="true" /> Back to workspace</Link>
    <div className="mb-9 mt-6"><p className="eyebrow">New study / 01</p><h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Every insight starts here.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted">Prepare your multi-modal MRI study. We’ll keep the original scans and predictions together in one workspace.</p></div>
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="glass-panel min-w-0 p-5 sm:p-8" aria-label="Upload an MRI study"><UploadDropzone /></section>
      <aside className="space-y-5 lg:sticky lg:top-28">
        <div className="glass-panel p-6"><p className="eyebrow">The workflow</p><ol className="mt-6 space-y-6">{[["01", "Prepare your study", "Four volumes from the same examination."], ["02", "Run segmentation", "Start the model from the case viewer."], ["03", "Review the prediction", "Compare MRI and overlay; export findings."]].map(([n, title, body], i) => <li key={n} className="flex gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${i === 0 ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-text-muted"}`}>{n}</span><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-6 text-text-muted">{body}</p></div></li>)}</ol></div>
        <div className="rounded-xl border border-border p-6"><h2 className="text-sm font-medium">Before you upload</h2><ul className="mt-4 space-y-3 text-xs leading-6 text-text-muted">{["T1, T1-CE, T2 and FLAIR are all required.", "Use aligned, preprocessed 3D NIfTI volumes.", "Or use one ZIP with a complete NIfTI case or named DICOM series."].map((text) => <li key={text} className="flex gap-2"><Check size={14} className="mt-1 shrink-0 text-primary" aria-hidden="true" />{text}</li>)}</ul><p className="mt-5 flex gap-2 border-t border-border pt-4 text-xs leading-6 text-text-muted"><Info size={15} className="mt-1 shrink-0" aria-hidden="true" />2D JPG/PNG slices cannot be used by this volumetric model.</p></div>
        <p className="flex gap-2 px-2 text-xs leading-6 text-text-muted"><LockKeyhole size={16} className="mt-1 shrink-0 text-success" aria-hidden="true" />Processed by your configured backend. Research use only; not for clinical decisions.</p>
      </aside>
    </div>
  </div>;
}
