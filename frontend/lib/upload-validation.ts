import { guessModality, isZipFile } from "./nifti";
import { MODALITIES } from "./types";

export function validateUploadFiles(files: { name: string; size: number }[]): string | null {
  if (!files.length) return "Add the four MRI modalities or one complete study ZIP.";
  if (files.some((f) => !/\.(nii(\.gz)?|zip)$/i.test(f.name))) return "Use NIfTI (.nii / .nii.gz) volumes or one ZIP. JPG and PNG slices are not supported.";
  if (files.some((f) => f.size === 0)) return "Remove empty files before uploading.";
  if (files.reduce((sum, f) => sum + f.size, 0) > 120 * 1024 * 1024) return "This upload exceeds the 120 MB workspace limit. Use a compressed study below this limit.";
  if (files.some((f) => isZipFile(f.name))) return files.length === 1 ? null : "Upload one ZIP by itself, or remove it and use individual NIfTI files.";
  const modalities = files.map((f) => guessModality(f.name));
  if (modalities.some((m) => m === null)) return "A filename could not be recognized. Include t1, t1ce, t2 or flair in each MRI filename.";
  if (MODALITIES.some((m) => modalities.filter((found) => found === m).length > 1)) return "More than one file matches a modality. Keep only one study's T1, T1-CE, T2 and FLAIR.";
  if (MODALITIES.some((m) => !modalities.includes(m))) return "Add all four MRI modalities to enable upload.";
  return null;
}

export function canUploadStudy(name: string, files: { name: string; size: number }[], submitting: boolean): boolean {
  return name.trim().length > 0 && !submitting && validateUploadFiles(files) === null;
}
