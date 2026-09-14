import type { Modality } from "./types";

/**
 * Guess a BraTS modality from a filename using the standard BraTS naming convention,
 * e.g. `BraTS2021_00000_t1ce.nii.gz`, `Patient01-flair.nii.gz`.
 */
export function guessModality(filename: string): Modality | "seg" | null {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".nii.gz") && !lower.endsWith(".nii")) return null;

  // Order matters: check t1ce before t1 so "t1ce" doesn't match the "t1" branch.
  if (/(^|[_\-.])t1ce([_\-.]|$)/.test(lower) || lower.includes("t1ce")) return "t1ce";
  if (/(^|[_\-.])t1([_\-.]|$)/.test(lower)) return "t1";
  if (/(^|[_\-.])t2([_\-.]|$)/.test(lower)) return "t2";
  if (/(^|[_\-.])flair([_\-.]|$)/.test(lower)) return "flair";
  if (/(^|[_\-.])seg([_\-.]|$)/.test(lower)) return "seg";
  return null;
}

export function isZipFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".zip");
}

export function isNiftiFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".nii.gz") || lower.endsWith(".nii");
}
