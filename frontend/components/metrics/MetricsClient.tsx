"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import type { MetricsPayload } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { LossChart } from "@/components/metrics/LossChart";
import { DiceBarChart } from "@/components/metrics/DiceBarChart";

export function MetricsClient() {
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .metrics()
      .then(setMetrics)
      .catch((e: unknown) => setError(e instanceof ApiRequestError ? e.message : "Failed to load metrics"));
  }, []);

  if (error) {
    return <EmptyState icon={AlertTriangle} title="Can't load metrics" description={error} />;
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={26} label="Loading metrics" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {metrics.demo_mode && <DemoModeBanner />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Training &amp; validation loss</CardTitle>
            <CardDescription>Combined Dice + BCE loss per epoch</CardDescription>
          </CardHeader>
          <CardContent>
            <LossChart epochs={metrics.epochs} trainLoss={metrics.train_loss} valLoss={metrics.val_loss} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation Dice by class</CardTitle>
            <CardDescription>Higher is better — 100% is a perfect overlap with ground truth</CardDescription>
          </CardHeader>
          <CardContent>
            <DiceBarChart dicePerClass={metrics.dice_per_class} />
          </CardContent>
        </Card>
      </div>

      {metrics.notes && (
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">{metrics.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
