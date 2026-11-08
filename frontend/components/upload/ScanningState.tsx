"use client";

import { motion } from "framer-motion";
import { ScanLine } from "lucide-react";
import { useReducedMotion } from "@/lib/motion";

/** Indeterminate activity only. Render while an actual request is pending, never on a timer. */
export function ScanningState({ label = "Running tumor segmentation…", overlay = false }: { label?: string; overlay?: boolean }) {
  const reduced = useReducedMotion();
  return <div className={overlay ? "pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg bg-bg/25" : "relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-5"}>
    {!reduced && <motion.div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/3 border-b border-primary/80 bg-gradient-to-b from-transparent to-primary/20 shadow-glow" initial={{ y: "-100%" }} animate={{ y: ["-100%", "300%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />}
    <div className={overlay ? "absolute bottom-4 left-4 right-4 flex items-center justify-center gap-3 rounded-lg border border-primary/20 bg-bg/90 p-4 backdrop-blur" : "relative flex items-center gap-3"} role="status" aria-live="polite">
      <ScanLine size={22} className="shrink-0 text-primary" aria-hidden="true" /><div><p className="text-sm font-medium text-text">{label}</p><p className="mt-1 text-xs leading-5 text-text-muted">Waiting for the backend. This animation does not indicate completion percentage.</p></div>
    </div>
  </div>;
}
