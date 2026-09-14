"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Cpu, ShieldCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export function BackendStatusCard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((h) => !cancelled && setHealth(h))
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiRequestError ? e.message : "Unknown error reaching backend");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
            <Activity size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Backend status</p>
            {loading && <Spinner size={14} label="Checking backend" />}
            {!loading && error && (
              <p className="text-sm text-destructive flex items-center gap-1.5 mt-0.5">
                <AlertTriangle size={14} aria-hidden="true" /> {error}
              </p>
            )}
            {!loading && health && (
              <p className="text-sm text-text-muted mt-0.5">
                Running on <span className="mono-numeric">{health.device}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!loading && health && (
            <>
              <Badge tone={health.checkpoint_loaded ? "success" : "warning"}>
                <ShieldCheck size={12} aria-hidden="true" />
                {health.checkpoint_loaded ? "Trained model loaded" : "Demo mode"}
              </Badge>
              <Badge tone="default">
                <Cpu size={12} aria-hidden="true" />
                {health.torch_available ? "PyTorch ready" : "PyTorch missing"}
              </Badge>
            </>
          )}
          {!loading && error && <Badge tone="destructive">Offline</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
