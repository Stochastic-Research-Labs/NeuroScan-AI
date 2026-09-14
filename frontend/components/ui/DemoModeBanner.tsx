import { FlaskConical } from "lucide-react";

export function DemoModeBanner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning ${className ?? ""}`}
    >
      <FlaskConical size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-medium">Demonstration output — not for clinical use</p>
        <p className="text-warning/80 mt-0.5">
          This segmentation is synthetic and does not represent the uploaded scan. It exists only to test the workflow before training finishes. Drop your trained checkpoint into{" "}
          <code className="mono-numeric bg-warning/10 px-1 py-0.5 rounded">
            backend/models_store/model.pt
          </code>{" "}
          and restart the backend to see real predictions.
        </p>
      </div>
    </div>
  );
}
