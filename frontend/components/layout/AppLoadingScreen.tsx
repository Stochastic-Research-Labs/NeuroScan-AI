"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Full-screen branded splash shown only for the genuine gap between the server-rendered
 * HTML painting and this component's own client-side hydration — there is no artificial
 * delay. It renders synchronously (visible) on the server/first paint, then hides itself
 * the moment `useEffect` fires, which happens as soon as React has hydrated.
 */
export function AppLoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Unmount outright rather than toggling a `hidden` attribute: this element also carries
  // Tailwind's `flex` utility class, and an author stylesheet's `display` rule always beats
  // the browser's built-in `[hidden] { display: none }` UA rule regardless of specificity —
  // so `hidden` alone would never actually hide it once `flex` is present.
  if (mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-bg">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30",
          !reducedMotion && "animate-pulse"
        )}
      >
        <Brain size={28} strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-text-muted" role="status">
        Initializing NeuroScan AI…
      </p>
    </div>
  );
}
