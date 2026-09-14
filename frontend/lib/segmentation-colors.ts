/**
 * Single source of truth for segmentation class colors on the frontend. Values must stay in
 * sync by value with the backend's CLASS_INFO (backend/app/core/config.py) and the derived
 * WT/TC colors added in postprocessing.py — same "keep in sync" convention as lib/types.ts.
 *
 * ncr/ed/et come from real per-voxel BraTS labels (1/2/4) and can be toggled independently in
 * the NiiVue overlay. wt (whole tumor = ncr ∪ ed ∪ et) and tc (tumor core = ncr ∪ et) are
 * derived unions, not separate voxel labels, so they're summary-only — never toggled in the
 * 3D overlay's colormap.
 */
export const TUMOR_COLORS = {
  ncr: "#0EA5E9",
  ed: "#FACC15",
  et: "#EF4444",
  wt: "#22D3EE",
  tc: "#F97316",
} as const;

export type TumorClassKey = keyof typeof TUMOR_COLORS;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// BraTS label convention: 0 = background, 1 = NCR/NET, 2 = ED, 4 = ET.
export function getSegmentationColormap(visibleRegions?: string[]) {
  const [ncrR, ncrG, ncrB] = hexToRgb(TUMOR_COLORS.ncr);
  const [edR, edG, edB] = hexToRgb(TUMOR_COLORS.ed);
  const [etR, etG, etB] = hexToRgb(TUMOR_COLORS.et);

  const cmap = {
    R: [0, ncrR, edR, etR],
    G: [0, ncrG, edG, etG],
    B: [0, ncrB, edB, etB],
    A: [0, 200, 200, 200],
    I: [0, 1, 2, 4],
    labels: ["Background", "Necrotic Core (NCR/NET)", "Edema (ED)", "Enhancing Tumor (ET)"],
  };
  if (visibleRegions) {
    cmap.A[1] = visibleRegions.includes("ncr") ? 200 : 0;
    cmap.A[2] = visibleRegions.includes("ed") ? 200 : 0;
    cmap.A[3] = visibleRegions.includes("et") ? 200 : 0;
  }
  return cmap;
}
