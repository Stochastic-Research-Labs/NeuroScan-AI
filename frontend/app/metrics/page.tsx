import { MetricsClient } from "@/components/metrics/MetricsClient";

export const metadata = { title: "Metrics — NeuroScan AI" };

export default function MetricsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-2">
      <h1 className="text-2xl font-semibold text-text tracking-tight">Model performance</h1>
      <p className="text-sm text-text-muted max-w-xl mb-6">
        Training curves and per-class Dice scores from your Kaggle run, read from{" "}
        <code className="mono-numeric">backend/models_store/metrics.json</code>.
      </p>
      <MetricsClient />
    </div>
  );
}
