"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Hand,
  Maximize,
  Minimize,
  RotateCcw,
  Settings2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { ClassLegend } from "./ClassLegend";
import { ViewerControls } from "./ViewerControls";
import type { ClassVolumeStat, Modality } from "@/lib/types";
import { getSegmentationColormap } from "@/lib/segmentation-colors";

export type SliceType = "axial" | "coronal" | "sagittal" | "multiplanar" | "render";

// Confirmed against the installed @niivue/niivue 0.69.0 source: SLICE_TYPE enum values
// (AXIAL=0, CORONAL=1, SAGITTAL=2, MULTIPLANAR=3, RENDER=4) and screenSlices[i].axCorSag
// report the same numbers for each rendered multiplanar tile.
const SLICE_TYPE_VALUES: Record<SliceType, number> = {
  axial: 0,
  coronal: 1,
  sagittal: 2,
  multiplanar: 3,
  render: 4,
};
const AX_COR_SAG_TO_VIEW: Record<number, SliceType> = {
  0: "axial",
  1: "coronal",
  2: "sagittal",
  4: "render",
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 8;

export interface NiivueViewerProps {
  backgroundUrl: string;
  backgroundName: string;
  overlayUrl?: string | null;
  hasSegmentation: boolean;
  showOverlay: boolean;
  onToggleOverlay: () => void;
  overlayOpacity: number;
  onOpacityChange: (v: number) => void;
  sliceType: SliceType;
  onSliceTypeChange: (v: SliceType) => void;
  availableModalities: Modality[];
  modality: Modality;
  onModalityChange: (m: Modality) => void;
  visibleRegions?: string[];
  stats?: ClassVolumeStat[];
  onToggleRegion?: (key: string) => void;
}

/**
 * WebGL NIfTI viewer powered by @niivue/niivue. Loaded exclusively on the client
 * (see the `next/dynamic(..., { ssr: false })` wrapper wherever this is used) because
 * it touches the DOM canvas / WebGL context directly.
 *
 * Also owns the fullscreen experience: since `containerRef` (not the whole page) is what
 * goes fullscreen, the sidebar viewer-controls/legend cards outside this component become
 * unreachable in fullscreen — so this component renders its own compact control panel
 * (reusing <ViewerControls> and <ClassLegend>) that only shows while fullscreen.
 */
export function NiivueViewer({
  backgroundUrl,
  backgroundName,
  overlayUrl,
  hasSegmentation,
  showOverlay,
  onToggleOverlay,
  overlayOpacity,
  onOpacityChange,
  sliceType,
  onSliceTypeChange,
  availableModalities,
  modality,
  onModalityChange,
  visibleRegions,
  stats,
  onToggleRegion,
}: NiivueViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<any>(null);
  const defaultDragModeRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing 3D visualization…");
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  // Becomes true once Niivue has finished its async init and is attached to
  // the canvas. The loadVolumes effect depends on this so it re-runs as soon
  // as the viewer is ready (fixing the race condition where nvRef.current is
  // still null when the effect first fires).
  const [nvReady, setNvReady] = useState(false);

  // Initial mount: create the Niivue instance once.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { Niivue, DRAG_MODE } = await import("@niivue/niivue");
        if (cancelled || !canvasRef.current) return;
        const nv = new Niivue({
          backColor: [0.039, 0.059, 0.102, 1], // matches --bg
          show3Dcrosshair: true,
          dragAndDropEnabled: false,
        });
        await nv.attachToCanvas(canvasRef.current);
        nvRef.current = nv;
        defaultDragModeRef.current = nv.opts?.dragMode ?? DRAG_MODE.crosshair;
        if (!cancelled) setNvReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error("NiiVue failed to initialize", err);
          setError("The 3D viewer failed to start. Your browser may not support WebGL2.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload volumes whenever the background modality or overlay visibility changes.
  // Also re-runs when nvReady flips to true, which fires the initial load after
  // the async Niivue init completes (fixes the race with nvRef.current === null).
  useEffect(() => {
    let cancelled = false;

    async function loadVolumes() {
      const nv = nvRef.current;
      if (!nv) return;
      // Guard: NiiVue calls .toUpperCase() on each volume's url/name to detect
      // the file extension. Ensure both are non-empty strings before proceeding.
      if (!backgroundUrl) return;
      const safeUrl = String(backgroundUrl);
      // NiiVue's getFileExt() is called on `name || url`. The endpoint URL is
      // deliberately extensionless so download managers do not hijack viewer
      // requests; this explicit name preserves gzip/NIfTI format detection.
      const ensureNiiGz = (s: string) =>
        s.endsWith(".nii.gz") || s.endsWith(".nii") ? s : `${s}.nii.gz`;
      const safeName = ensureNiiGz(String(backgroundName || "scan"));
      const includesOverlay = showOverlay && !!overlayUrl;

      setLoading(true);
      setLoadingMessage(
        includesOverlay ? "Loading MRI volumes and segmentation…" : "Loading MRI volumes…"
      );
      setError(null);
      try {
        const volumeList: Record<string, unknown>[] = [
          { url: safeUrl, name: safeName, colormap: "gray", opacity: 1 },
        ];
        if (includesOverlay) {
          volumeList.push({
            url: String(overlayUrl),
            name: "segmentation.nii.gz",
            opacity: overlayOpacity,
          });
        }
        await nv.loadVolumes(volumeList);

        if (cancelled) return;

        if (includesOverlay && nv.volumes.length > 1) {
          // Use setColormapLabel() on the volume object to properly parse the label lut.
          nv.volumes[1].setColormapLabel(getSegmentationColormap(visibleRegions));
          nv.volumes[1].opacity = overlayOpacity;
          nv.updateGLVolume?.();
        }

        nv.setSliceType(SLICE_TYPE_VALUES[sliceType]);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("NiiVue failed to load volumes", err);
          setError("Unable to load MRI data. Please retry, or re-upload the case if this keeps happening.");
          setLoading(false);
        }
      }
    }

    loadVolumes();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvReady, backgroundUrl, overlayUrl, showOverlay]);

  // Opacity-only changes: avoid a full volume reload.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !showOverlay || nv.volumes?.length < 2) return;
    nv.volumes[1].opacity = overlayOpacity;
    nv.updateGLVolume?.();
  }, [overlayOpacity, showOverlay]);

  // Visible regions changes: update colormap labels dynamically.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !showOverlay || nv.volumes?.length < 2) return;
    nv.volumes[1].setColormapLabel(getSegmentationColormap(visibleRegions));
    nv.updateGLVolume?.();
  }, [visibleRegions, showOverlay]);

  // Slice-type-only changes.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv) return;
    nv.setSliceType(SLICE_TYPE_VALUES[sliceType]);
  }, [sliceType]);

  // Double-click a multiplanar tile to open just that view in fullscreen; double-click
  // again in a single view to exit. Listener is registered in the CAPTURE phase on the
  // *container* (not the canvas) so it runs before NiiVue's own canvas-level `dblclick`
  // listener (which resets brightness/contrast) — calling stopPropagation() here when we
  // handle the click prevents that side effect; clicks outside any tile fall through
  // untouched so the existing contrast-reset behavior still works everywhere else.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleDblClick = (e: MouseEvent) => {
      const nv = nvRef.current;
      // Toolbar buttons/panels are absolutely positioned on top of the canvas within this
      // same container, so a capture-phase listener here would otherwise see double-clicks
      // on them too (e.g. clicking "zoom out" twice quickly fires a native dblclick that
      // bubbles from the button). Only handle real double-clicks on the canvas itself.
      if (!nv || e.target !== canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const idx = typeof nv.tileIndex === "function" ? nv.tileIndex(x, y) : -1;
      if (idx < 0 || !nv.screenSlices?.[idx]) return;
      e.stopPropagation();

      if (sliceType === "multiplanar") {
        const nextView = AX_COR_SAG_TO_VIEW[nv.screenSlices[idx].axCorSag];
        if (nextView) onSliceTypeChange(nextView);
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current?.requestFullscreen().catch(() => {});
      }
    };

    container.addEventListener("dblclick", handleDblClick, { capture: true });
    return () => container.removeEventListener("dblclick", handleDblClick, { capture: true });
  }, [sliceType, onSliceTypeChange]);

  const zoomBy = (factor: number) => {
    const nv = nvRef.current;
    if (!nv?.scene) return;
    const pan: number[] = nv.scene.pan2Dxyzmm;
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pan[3] * factor));
    nv.scene.pan2Dxyzmm = [pan[0], pan[1], pan[2], nextZoom];
    nv.drawScene?.();
  };

  const resetView = () => {
    const nv = nvRef.current;
    if (!nv?.scene) return;
    nv.scene.pan2Dxyzmm = [0, 0, 0, 1];
    nv.scene.crosshairPos = [0.5, 0.5, 0.5];
    nv.drawScene?.();
  };

  const togglePan = async () => {
    const nv = nvRef.current;
    if (!nv) return;
    const { DRAG_MODE } = await import("@niivue/niivue");
    nv.setDragMode(panMode ? defaultDragModeRef.current ?? DRAG_MODE.crosshair : DRAG_MODE.pan);
    setPanMode((v) => !v);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toolbarButton =
    "flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black ${
        isFullscreen ? "h-screen rounded-none" : "aspect-square sm:aspect-video rounded-lg border border-border"
      }`}
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-label="NIfTI brain scan viewer" />

      {/* Zoom / pan / reset toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
        <button onClick={() => zoomBy(1.25)} className={toolbarButton} aria-label="Zoom in" title="Zoom in">
          <ZoomIn size={18} />
        </button>
        <button onClick={() => zoomBy(0.8)} className={toolbarButton} aria-label="Zoom out" title="Zoom out">
          <ZoomOut size={18} />
        </button>
        <button
          onClick={togglePan}
          className={`${toolbarButton} ${panMode ? "bg-primary/80 hover:bg-primary" : ""}`}
          aria-label="Pan"
          aria-pressed={panMode}
          title="Pan"
        >
          <Hand size={17} />
        </button>
        <button onClick={resetView} className={toolbarButton} aria-label="Reset view" title="Reset view">
          <RotateCcw size={17} />
        </button>
      </div>

      {/* Fullscreen toggle + (fullscreen-only) controls toggle */}
      <div className="absolute top-4 right-4 z-10 flex gap-1.5">
        {isFullscreen && (
          <button
            onClick={() => setControlsOpen((v) => !v)}
            className={toolbarButton}
            aria-label={controlsOpen ? "Hide controls" : "Show controls"}
            aria-pressed={controlsOpen}
            title={controlsOpen ? "Hide controls" : "Show controls"}
          >
            {controlsOpen ? <X size={18} /> : <Settings2 size={18} />}
          </button>
        )}
        <button
          onClick={toggleFullscreen}
          className={toolbarButton}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen (or double-click)" : "Enter fullscreen (or double-click a panel)"}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {/* Fullscreen control panel: the sidebar controls/legend are outside this container
          (and thus unreachable) once only the container itself goes fullscreen, so this
          reuses the same <ViewerControls>/<ClassLegend> components in a floating panel. */}
      {isFullscreen && controlsOpen && (
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto z-10 w-auto sm:w-[300px] max-h-[75vh] overflow-y-auto rounded-lg bg-card/95 border border-border-strong backdrop-blur p-4 space-y-5">
          <ViewerControls
            availableModalities={availableModalities}
            modality={modality}
            onModalityChange={onModalityChange}
            hasSegmentation={hasSegmentation}
            showOverlay={showOverlay}
            onToggleOverlay={onToggleOverlay}
            overlayOpacity={overlayOpacity}
            onOpacityChange={onOpacityChange}
            sliceType={sliceType}
            onSliceTypeChange={onSliceTypeChange}
          />
          {hasSegmentation && stats && stats.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                Tumor sub-regions
              </p>
              <ClassLegend
                stats={stats}
                visibleRegions={visibleRegions}
                onToggleRegion={onToggleRegion}
              />
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Spinner size={28} label={loadingMessage} />
        </div>
      )}
      {loading && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs text-white/80" aria-hidden="true">
          {loadingMessage}
        </p>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center">
          <AlertTriangle size={24} className="text-destructive" aria-hidden="true" />
          <p className="text-sm text-text">{error}</p>
        </div>
      )}
    </div>
  );
}
