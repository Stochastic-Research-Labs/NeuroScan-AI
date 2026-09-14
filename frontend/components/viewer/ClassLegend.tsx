import type { ClassVolumeStat } from "@/lib/types";
import { formatVolume } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface ClassLegendProps {
  stats: ClassVolumeStat[];
  visibleRegions?: string[];
  onToggleRegion?: (key: string) => void;
}

export function ClassLegend({ stats, visibleRegions = [], onToggleRegion }: ClassLegendProps) {
  // NCR/ED/ET are individual voxel labels — the NiiVue overlay can toggle each
  // independently. WT (whole tumor) and TC (tumor core) are derived unions of those
  // labels, not separate labels themselves, so they're shown as read-only totals below
  // rather than as toggles.
  const regions = stats.filter((s) => s.key === "ncr" || s.key === "ed" || s.key === "et");
  const summary = stats.filter((s) => s.key === "wt" || s.key === "tc");

  return (
    <div className="space-y-3">
      <ul className="space-y-2" aria-label="Segmentation class legend">
        {regions.map((s) => {
        const isVisible = visibleRegions.includes(s.key);
        return (
          <li key={s.key} className={`flex items-center justify-between gap-3 text-sm transition-opacity ${!isVisible ? "opacity-50" : ""}`}>
            <button
              type="button"
              onClick={() => onToggleRegion?.(s.key)}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm transition-opacity"
              aria-pressed={isVisible}
              aria-label={`Toggle visibility of ${s.label}`}
            >
              <div className="relative flex items-center justify-center h-4 w-4 shrink-0">
                <span
                  className="absolute inset-0 rounded-sm ring-1 ring-white/10"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                {!isVisible && (
                  <div className="absolute inset-0 bg-black/40 rounded-sm flex items-center justify-center">
                    <EyeOff size={10} className="text-white" />
                  </div>
                )}
                {isVisible && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Eye size={10} className="text-black/50" />
                  </div>
                )}
              </div>
              <span className="text-text truncate">{s.label}</span>
            </button>
            <span className="mono-numeric text-text-muted shrink-0">{formatVolume(s.volume_cm3)}</span>
          </li>
        );
        })}
      </ul>

      {summary.length > 0 && (
        <ul className="space-y-1.5 border-t border-border pt-3" aria-label="Composite tumor volumes">
          {summary.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className="h-4 w-4 shrink-0 rounded-sm ring-1 ring-white/10"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                <span className="text-text-muted truncate">{s.label}</span>
              </span>
              <span className="mono-numeric text-text shrink-0 font-medium">
                {formatVolume(s.volume_cm3)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
