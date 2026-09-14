"use client";

import { Box, Eye, EyeOff, Grid2x2, Layers, RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
import { MODALITIES, MODALITY_LABELS, type Modality } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { SliceType } from "./NiivueViewer";

const SLICE_OPTIONS: { value: SliceType; label: string; icon: typeof Grid2x2 }[] = [
  { value: "multiplanar", label: "Multi-planar", icon: Grid2x2 },
  { value: "axial", label: "Axial", icon: RectangleHorizontal },
  { value: "coronal", label: "Coronal", icon: RectangleVertical },
  { value: "sagittal", label: "Sagittal", icon: Square },
  { value: "render", label: "3D render", icon: Box },
];

export function ViewerControls({
  availableModalities,
  modality,
  onModalityChange,
  hasSegmentation,
  showOverlay,
  onToggleOverlay,
  overlayOpacity,
  onOpacityChange,
  sliceType,
  onSliceTypeChange,
}: {
  availableModalities: Modality[];
  modality: Modality;
  onModalityChange: (m: Modality) => void;
  hasSegmentation: boolean;
  showOverlay: boolean;
  onToggleOverlay: () => void;
  overlayOpacity: number;
  onOpacityChange: (v: number) => void;
  sliceType: SliceType;
  onSliceTypeChange: (v: SliceType) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Modality</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="MRI modality">
          {MODALITIES.filter((m) => availableModalities.includes(m)).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modality === m}
              onClick={() => onModalityChange(m)}
              className={cn(
                "min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                modality === m
                  ? "bg-primary text-white ring-primary"
                  : "bg-surface text-text-muted ring-border hover:text-text hover:ring-border-strong"
              )}
            >
              {MODALITY_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Layout</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Slice layout">
          {SLICE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sliceType === value}
              onClick={() => onSliceTypeChange(value)}
              title={label}
              aria-label={label}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md ring-1 transition-colors",
                sliceType === value
                  ? "bg-primary text-white ring-primary"
                  : "bg-surface text-text-muted ring-border hover:text-text hover:ring-border-strong"
              )}
            >
              <Icon size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {hasSegmentation && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Segmentation overlay</p>
            <button
              type="button"
              onClick={onToggleOverlay}
              aria-pressed={showOverlay}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              {showOverlay ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
              {showOverlay ? "Visible" : "Hidden"}
            </button>
          </div>
          <label htmlFor="overlay-opacity" className="sr-only">
            Overlay opacity
          </label>
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-text-muted shrink-0" aria-hidden="true" />
            <input
              id="overlay-opacity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={overlayOpacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              disabled={!showOverlay}
              className="w-full accent-primary disabled:opacity-40"
            />
            <span className="mono-numeric text-xs text-text-muted w-9 text-right">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
