"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Download, PlayCircle, RefreshCw, FileText } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import type { CaseDetail, Modality, PredictionResult } from "@/lib/types";
import { MODALITY_LABELS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { ClassLegend } from "@/components/viewer/ClassLegend";
import { ViewerControls } from "@/components/viewer/ViewerControls";
import type { SliceType } from "@/components/viewer/NiivueViewer";
import { formatMs } from "@/lib/utils";

const NiivueViewer = dynamic(
  () => import("@/components/viewer/NiivueViewer").then((m) => m.NiivueViewer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square sm:aspect-video w-full rounded-lg border border-border bg-black flex items-center justify-center">
        <Spinner size={28} label="Preparing MRI viewer…" />
      </div>
    ),
  }
);

export function CaseDetailClient({ caseId }: { caseId: string }) {
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [modality, setModality] = useState<Modality>("t1ce");
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [sliceType, setSliceType] = useState<SliceType>("multiplanar");
  const [visibleRegions, setVisibleRegions] = useState<string[]>(["ncr", "ed", "et"]);

  const loadCase = useCallback(() => {
    api
      .getCase(caseId)
      .then((c) => {
        setCaseDetail(c);
        if (c.modalities_present.length > 0 && !c.modalities_present.includes(modality)) {
          setModality(c.modalities_present[0]);
        }
      })
      .catch((e: unknown) => setError(e instanceof ApiRequestError ? e.message : "Failed to load case"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  async function handlePredict() {
    setPredicting(true);
    setError(null);
    try {
      const result = await api.predict(caseId);
      setPrediction(result);
      loadCase();
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : "Segmentation could not be completed. Please retry the analysis."
      );
    } finally {
      setPredicting(false);
    }
  }

  const handleToggleRegion = (key: string) => {
    setVisibleRegions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  function handleDownloadReport() {
    if (!caseDetail) return;
    setGeneratingPdf(true);
    setPdfError(null);

    // Do not fetch the PDF into JavaScript. Browser extensions can alter a fetch response,
    // then cause a false validation failure and an unwanted about:blank fallback tab. A normal
    // same-page link lets the browser handle the attachment response directly.
    const link = document.createElement("a");
    link.href = api.reportUrl(caseId);
    link.download = `NeuroScan-Report-${caseDetail.case_id}.pdf`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => setGeneratingPdf(false), 250);
  }

  if (error && !caseDetail) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load this case"
          description={error}
          action={
            <Button variant="secondary" onClick={() => { setError(null); loadCase(); }}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} label="Loading case" />
      </div>
    );
  }

  const hasSegmentation = caseDetail.has_segmentation || !!prediction;
  const segmentationUrl = hasSegmentation ? api.segmentationUrl(caseId) : null;
  // Prefer a fresh in-session prediction; fall back to the stats persisted on the case
  // itself so the legend still shows after a reload without forcing a re-run.
  const stats = prediction?.class_stats ?? caseDetail.class_stats ?? [];
  const inferenceTimeMs = prediction?.inference_time_ms ?? caseDetail.inference_time_ms;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">{caseDetail.name}</h1>
          <p className="mono-numeric text-xs text-text-muted mt-1">{caseDetail.case_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadReport}
            disabled={generatingPdf || !hasSegmentation}
            title={!hasSegmentation ? "Run segmentation to generate a report" : undefined}
            className="bg-card text-text border border-border-strong hover:bg-card/80 hover:border-primary/40 h-11 px-4 inline-flex gap-2 rounded-md"
          >
            {generatingPdf ? <Spinner size={16} /> : <FileText size={16} aria-hidden="true" />}
            {generatingPdf ? "Generating report…" : "Export PDF"}
          </Button>
          {segmentationUrl && (
            <a
              href={segmentationUrl}
              download="segmentation.nii.gz"
              className="inline-flex items-center gap-2 h-11 px-4 rounded-md text-sm font-medium bg-card text-text border border-border-strong hover:border-primary/40"
            >
              <Download size={16} aria-hidden="true" /> Download mask
            </a>
          )}
          <Button onClick={handlePredict} loading={predicting}>
            {hasSegmentation ? <RefreshCw size={16} aria-hidden="true" /> : <PlayCircle size={16} aria-hidden="true" />}
            {predicting ? "Running tumor segmentation…" : hasSegmentation ? "Re-run segmentation" : "Run segmentation"}
          </Button>
        </div>
      </div>

      {prediction?.demo_mode && <DemoModeBanner />}
      {error && (
        <p role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={handlePredict}
            className="underline underline-offset-2 hover:text-destructive/80"
          >
            Retry
          </button>
        </p>
      )}
      {pdfError && (
        <p role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {pdfError}
          <button
            type="button"
            onClick={handleDownloadReport}
            className="underline underline-offset-2 hover:text-destructive/80"
          >
            Retry
          </button>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <NiivueViewer
          backgroundUrl={api.volumeUrl(caseId, modality)}
          backgroundName={`${MODALITY_LABELS[modality]}.nii.gz`}
          overlayUrl={segmentationUrl}
          hasSegmentation={hasSegmentation}
          showOverlay={showOverlay && hasSegmentation}
          onToggleOverlay={() => setShowOverlay((v) => !v)}
          overlayOpacity={overlayOpacity}
          onOpacityChange={setOverlayOpacity}
          sliceType={sliceType}
          onSliceTypeChange={setSliceType}
          availableModalities={caseDetail.modalities_present}
          modality={modality}
          onModalityChange={setModality}
          visibleRegions={visibleRegions}
          stats={stats}
          onToggleRegion={handleToggleRegion}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Viewer controls</CardTitle>
            </CardHeader>
            <CardContent>
              <ViewerControls
                availableModalities={caseDetail.modalities_present}
                modality={modality}
                onModalityChange={setModality}
                hasSegmentation={hasSegmentation}
                showOverlay={showOverlay}
                onToggleOverlay={() => setShowOverlay((v) => !v)}
                overlayOpacity={overlayOpacity}
                onOpacityChange={setOverlayOpacity}
                sliceType={sliceType}
                onSliceTypeChange={setSliceType}
              />
            </CardContent>
          </Card>

          {hasSegmentation && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tumor sub-regions</CardTitle>
                {inferenceTimeMs != null && (
                  <Badge tone="default">{formatMs(inferenceTimeMs)}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {stats.length > 0 ? (
                  <ClassLegend
                    stats={stats}
                    visibleRegions={visibleRegions}
                    onToggleRegion={handleToggleRegion}
                  />
                ) : (
                  <p className="text-sm text-text-muted">
                    Volume stats appear here after you run segmentation.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
