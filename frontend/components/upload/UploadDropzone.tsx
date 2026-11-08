"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, FileArchive, Layers3, UploadCloud, X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { guessModality, isZipFile } from "@/lib/nifti";
import { MODALITIES, MODALITY_LABELS } from "@/lib/types";
import { canUploadStudy, validateUploadFiles } from "@/lib/upload-validation";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ScanningState } from "./ScanningState";

export function UploadDropzone() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [caseName, setCaseName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(rejected.length ? "Some files were rejected. Select .nii, .nii.gz, or one study ZIP." : null);
    setFiles((prev) => {
      const next = new Map(prev.map((f) => [f.name, f]));
      for (const f of accepted) next.set(f.name, f);
      return Array.from(next.values());
    });
  }, []);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, noClick: true, noKeyboard: true, disabled: submitting,
    accept: { "application/gzip": [".gz"], "application/zip": [".zip"], "application/octet-stream": [".nii", ".gz", ".zip"] }, multiple: true,
  });
  const containsZip = files.some((f) => isZipFile(f.name));
  const detected = useMemo(() => new Map(files.map((f) => [guessModality(f.name), f])), [files]);
  const fileIssue = validateUploadFiles(files);
  const canSubmit = canUploadStudy(caseName, files, submitting);
  const hint = !caseName.trim() ? "Enter a case name to continue." : fileIssue ?? "All set. Upload your study to open the MRI viewer.";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true); setError(null);
    try {
      const result = await api.uploadCase(caseName.trim(), files);
      router.push(`/cases/${result.case_id}`);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Upload failed. Please try again.");
      setSubmitting(false);
    }
  }

  return <form onSubmit={handleSubmit} className="space-y-7" aria-busy={submitting}>
    <div><label htmlFor="case-name" className="mb-2 block text-sm font-medium">Case name <span className="text-primary">*</span></label>
      <input id="case-name" type="text" required maxLength={120} disabled={submitting} value={caseName} onChange={(e) => setCaseName(e.target.value)} aria-describedby="case-name-help" placeholder="e.g. Research study 014" className="h-12 w-full rounded-lg border border-border-strong bg-bg/50 px-4 text-base placeholder:text-text-muted/70 disabled:opacity-60" />
      <p id="case-name-help" className="mt-2 text-xs leading-6 text-text-muted">Use a study identifier. Avoid directly identifying patient information.</p>
    </div>
    <div {...getRootProps()} className={cn("relative rounded-2xl border border-dashed p-7 text-center transition-colors sm:p-10", isDragActive ? "border-primary bg-primary/10 shadow-glow" : "border-border-strong bg-surface/50 hover:border-primary/60")}>
      <input {...getInputProps()} aria-label="Select NIfTI MRI volumes or a study ZIP" />
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><UploadCloud size={30} strokeWidth={1.5} aria-hidden="true" /></span>
      <h2 className="mt-5 text-lg font-medium">{isDragActive ? "Drop your study here" : "Bring your study into focus."}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-text-muted">Drag your MRI volumes here, or choose files from your computer.</p>
      <Button type="button" variant="secondary" onClick={open} disabled={submitting} className="mt-5">Browse files <ArrowUpRight size={16} aria-hidden="true" /></Button>
      <p className="mt-4 text-xs text-text-muted">.nii / .nii.gz / .zip · Up to 120 MB total</p>
    </div>
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">Study completeness</h2><p className="text-xs text-text-muted">{containsZip ? "ZIP contents checked by the backend" : `${MODALITIES.filter((m) => detected.has(m)).length} of 4 modalities selected`}</p></div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">{MODALITIES.map((m) => {
        const file = detected.get(m);
        return <li key={m} className={cn("min-w-0 rounded-xl border p-3", file ? "border-primary/40 bg-primary/5" : "border-border bg-bg/30")}><div className="flex items-center justify-between gap-2"><Layers3 size={16} className={file ? "text-primary" : "text-text-muted"} aria-hidden="true" />{file && <Check size={14} className="text-success" aria-hidden="true" />}</div><p className="mt-3 text-xs font-medium">{MODALITY_LABELS[m]}</p><p className="mt-1 text-[11px] text-text-muted">{file ? formatBytes(file.size) : containsZip ? "Check on upload" : "Not selected"}</p></li>;
      })}</ul>
    </div>
    {files.length > 0 && <ul className="divide-y divide-border rounded-xl border border-border bg-bg/30" aria-label="Selected files">{files.map((f) => <li key={f.name} className="flex min-w-0 items-center gap-3 px-3 py-2"><FileArchive size={17} className="shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="break-all text-xs leading-6">{f.name}</p><p className="text-[11px] text-text-muted">{formatBytes(f.size)}{guessModality(f.name) === "seg" ? " · Reference mask (not a model input)" : ""}</p></div><button type="button" disabled={submitting} onClick={() => setFiles((prev) => prev.filter((file) => file.name !== f.name))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" aria-label={`Remove ${f.name}`}><X size={17} /></button></li>)}</ul>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">{error}</p>}
    {submitting && <ScanningState label="Uploading and validating your study…" />}
    <div className="border-t border-border pt-6"><Button type="submit" disabled={!canSubmit} loading={submitting} size="lg" className="w-full">{submitting ? "Uploading study…" : "Upload case"}{!submitting && <ArrowUpRight size={18} aria-hidden="true" />}</Button><p className={cn("mt-3 text-center text-xs leading-6", canSubmit ? "text-success" : "text-text-muted")} aria-live="polite">{submitting ? "Keep this page open while the upload completes." : hint}</p></div>
  </form>;
}
