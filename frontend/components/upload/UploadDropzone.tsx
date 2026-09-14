"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, FileArchive, UploadCloud, X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { guessModality, isZipFile } from "@/lib/nifti";
import { MODALITIES, MODALITY_LABELS, type Modality } from "@/lib/types";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function UploadDropzone() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [caseName, setCaseName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null);
    if (rejected.length > 0) {
          setError("Use .nii, .nii.gz, or one .zip containing NIfTI or DICOM series.");
    }
    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      const seen = new Set<string>();
      return merged.filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/gzip": [".gz"],
      "application/zip": [".zip"],
      "application/octet-stream": [".nii", ".gz", ".zip"],
    },
    multiple: true,
  });

  const containsZip = useMemo(() => files.some((f) => isZipFile(f.name)), [files]);

  const detected = useMemo(() => {
    const map = new Map<Modality, File>();
    for (const f of files) {
      const m = guessModality(f.name);
      if (m && m !== "seg") map.set(m, f);
    }
    return map;
  }, [files]);

  const canSubmit =
    caseName.trim().length > 0 &&
    files.length > 0 &&
    !submitting &&
    (containsZip || MODALITIES.every((m) => detected.has(m)));

  const submitHint = caseName.trim().length === 0
    ? "Enter a case name above to enable upload."
    : !containsZip && !MODALITIES.every((m) => detected.has(m))
      ? "Add all four MRI modalities to enable upload."
      : canSubmit
        ? "Ready to upload and analyze this case."
        : "Preparing upload…";

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.uploadCase(caseName.trim(), files);
      router.push(`/cases/${result.case_id}`);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Upload failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="case-name" className="block text-sm font-medium text-text mb-2">
          Case name
        </label>
        <input
          id="case-name"
          type="text"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          placeholder="e.g. Patient 014 — follow-up scan"
          className="w-full h-11 rounded-md border border-border-strong bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus-visible:outline-none"
        />
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors sm:p-12",
          isDragActive ? "border-primary bg-primary/5" : "border-border-strong hover:border-primary/50 hover:bg-card"
        )}
      >
        <input {...getInputProps()} aria-label="Upload NIfTI scans or a zipped NIfTI or DICOM study" />
        <UploadCloud size={32} className="mx-auto text-primary" aria-hidden="true" />
        <p className="mt-3 text-base font-semibold text-text">
          {isDragActive ? "Drop the files here" : "Drag & drop scans, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Accepts individual T1 / T1-CE / T2 / FLAIR NIfTI files, or one ZIP with NIfTI files or DICOM series named T1, T1CE, T2 and FLAIR
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!containsZip && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-text">Required modalities</p><p className="text-xs text-text-muted">All four are needed to start</p></div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODALITIES.map((m) => {
              const found = detected.has(m);
              return (
                <li
                  key={m}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ring-1",
                    found ? "bg-success/10 text-success ring-success/30" : "bg-card text-text-muted ring-border"
                  )}
                >
                  {found ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
                  {MODALITY_LABELS[m]}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileArchive size={16} className="text-text-muted shrink-0" aria-hidden="true" />
                <span className="text-sm text-text truncate">{f.name}</span>
                <span className="mono-numeric text-xs text-text-muted shrink-0">{formatBytes(f.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 shrink-0"
                aria-label={`Remove ${f.name}`}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting} size="lg" className="w-full sm:w-auto">
        {submitting ? "Uploading…" : "Upload case"}
      </Button>
      <p
        className={cn("text-sm", canSubmit ? "text-success" : "text-text-muted")}
        aria-live="polite"
      >
        {submitHint}
      </p>
    </div>
  );
}
