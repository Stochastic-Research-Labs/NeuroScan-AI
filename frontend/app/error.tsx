"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/30">
        <AlertOctagon size={22} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-text">Something went wrong</h2>
      <p className="text-sm text-text-muted max-w-md">{error.message || "An unexpected error occurred."}</p>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
