"use client";

import { useCallback, useRef, useState } from "react";
import { Columns2, Link2, Square } from "lucide-react";
import type { Niivue } from "@niivue/niivue";
import { NiivueViewer, type NiivueViewerProps } from "./NiivueViewer";
import { ScanningState } from "@/components/upload/ScanningState";
import { cn } from "@/lib/utils";

const noop = () => {};

export function ComparisonViewer({ processing, ...props }: NiivueViewerProps & { processing: boolean }) {
  const [compare, setCompare] = useState(true);
  const viewers = useRef<{ original: Niivue | null; prediction: Niivue | null }>({ original: null, prediction: null });
  const register = useCallback((key: "original" | "prediction", viewer: Niivue | null) => {
    const previous = viewers.current[key];
    previous?.broadcastTo([]);
    viewers.current[key] = viewer;
    const { original, prediction } = viewers.current;
    original?.broadcastTo(prediction ? [prediction] : [], { "2d": true, "3d": true });
    prediction?.broadcastTo(original ? [original] : [], { "2d": true, "3d": true });
  }, []);
  const originalReady = useCallback((viewer: Niivue | null) => register("original", viewer), [register]);
  const predictionReady = useCallback((viewer: Niivue | null) => register("prediction", viewer), [register]);
  const syncToolbar = useCallback((source: Niivue) => {
    const { original, prediction } = viewers.current;
    const target = source === original ? prediction : original;
    if (!target?.volumes.length || !source.volumes.length) return;
    // Native broadcast only runs when a canvas has focus. Toolbar buttons must
    // synchronize explicitly without stealing keyboard focus from the button.
    source.doSync2d(target);
    source.doSync3d(target);
    target.drawScene();
  }, []);

  return <section className="min-w-0 space-y-4" aria-label="MRI comparison workspace">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-xs text-text-muted"><Link2 size={14} className="text-primary" aria-hidden="true" />{compare ? "Linked slice and orientation controls" : "Interactive volume viewer"}</p>
      <div className="flex rounded-lg border border-border bg-bg p-1" role="group" aria-label="Viewer comparison mode">{[{ enabled: true, Icon: Columns2, label: "Compare" }, { enabled: false, Icon: Square, label: "Single" }].map(({ enabled, Icon, label }) => <button key={label} type="button" onClick={() => setCompare(enabled)} aria-pressed={compare === enabled} className={cn("flex min-h-10 items-center gap-2 rounded-md px-3 text-xs transition-colors", compare === enabled ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}><Icon size={14} aria-hidden="true" />{label}</button>)}</div>
    </div>
    <div className={cn("grid gap-4", compare && "xl:grid-cols-2")}>
      {compare && <div className="min-w-0 rounded-xl border border-border bg-card/40 p-2"><p className="px-2 pb-3 pt-2 text-xs font-medium">Original MRI <span className="ml-2 text-text-muted">/ no overlay</span></p><NiivueViewer {...props} overlayUrl={null} hasSegmentation={false} showOverlay={false} onToggleOverlay={noop} onReady={originalReady} onViewChange={syncToolbar} /></div>}
      <div className="min-w-0 rounded-xl border border-primary/25 bg-card/40 p-2"><p className="px-2 pb-3 pt-2 text-xs font-medium">{props.hasSegmentation ? "Predicted segmentation" : "Analysis view"}<span className="ml-2 text-primary">/ {props.hasSegmentation ? "overlay" : "awaiting inference"}</span></p><div className="relative"><NiivueViewer {...props} onReady={predictionReady} onViewChange={syncToolbar} />{processing && <ScanningState overlay />}</div></div>
    </div>
    <p className="text-xs leading-6 text-text-muted">Scroll inside a scan to change slices. Use the toolbar to zoom or pan; double-click a scan to inspect it fullscreen. {props.hasSegmentation ? "The overlay is a model prediction, not a reference annotation." : "Run segmentation to generate a prediction."}</p>
  </section>;
}
