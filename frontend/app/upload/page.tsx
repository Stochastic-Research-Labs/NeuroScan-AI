import { ClipboardCheck, LockKeyhole } from "lucide-react";
import { UploadDropzone } from "@/components/upload/UploadDropzone";

export const metadata = { title: "Upload a case — NeuroScan AI" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">New analysis</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Prepare an MRI case</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            Add one complete study. Upload the four NIfTI modalities individually, or select one ZIP containing a BraTS-style NIfTI case or four clearly named DICOM series.
          </p>
        </div>
        <aside className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-text"><ClipboardCheck size={17} className="text-primary" aria-hidden="true" /> Before you upload</div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-muted">
            <li>• One case per upload</li>
            <li>• T1, T1-CE, T2 and FLAIR required</li>
            <li>• NIfTI files, or one ZIP with NIfTI/DICOM series</li>
          </ul>
          <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs text-success"><LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Files stay on this local workspace.</p>
        </aside>
      </div>
      <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card sm:p-7">
        <UploadDropzone />
      </div>
    </div>
  );
}
