"use client";

import { useEffect, useState } from "react";
import { FolderOpen, ImageOff } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import type { CaseSummary } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ButtonLink } from "@/components/ui/Button";
import { CaseCard } from "@/components/cases/CaseCard";

export function CaseList() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listCases()
      .then((c) => !cancelled && setCases(c))
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiRequestError ? e.message : "Failed to load cases");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent cases</CardTitle>
          <CardDescription>Patient scans uploaded on this machine</CardDescription>
        </div>
        <ButtonLink href="/upload" size="sm" variant="secondary">
          Upload case
        </ButtonLink>
      </CardHeader>
      <CardContent>
        {!cases && !error && <Spinner label="Loading cases" />}
        {error && (
          <EmptyState
            icon={ImageOff}
            title="Can't load cases"
            description={error}
          />
        )}
        {cases && cases.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="No cases yet"
            description="Upload a patient's T1, T1-CE, T2, and FLAIR scans to run your first segmentation."
            action={
              <ButtonLink href="/upload" size="sm">
                Upload your first case
              </ButtonLink>
            }
          />
        )}
        {cases && cases.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cases.map((c) => (
              <li key={c.case_id}>
                <CaseCard caseSummary={c} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
