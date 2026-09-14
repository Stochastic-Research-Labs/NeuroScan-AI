import type {
  CaseDetail,
  CaseSummary,
  HealthStatus,
  MetricsPayload,
  PredictionResult,
} from "./types";

// Route browser requests through Next.js by default. Besides removing CORS as a failure
// point, this protects local WebGL volume loads from extensions that intercept requests
// to a separate localhost port. Set NEXT_PUBLIC_API_BASE_URL only for an intentional
// remote backend deployment.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiRequestError(
      "Can't reach the NeuroScan backend. Is it running on localhost:8000?",
      0
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore, use statusText
    }
    throw new ApiRequestError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  base: API_BASE,

  health: () => request<HealthStatus>("/api/health"),

  metrics: () => request<MetricsPayload>("/api/metrics"),

  listCases: () => request<CaseSummary[]>("/api/cases"),

  getCase: (caseId: string) => request<CaseDetail>(`/api/cases/${caseId}`),

  async uploadCase(name: string, files: File[]): Promise<CaseDetail> {
    const form = new FormData();
    form.append("name", name);
    for (const file of files) {
      form.append("files", file, file.name);
    }
    return request<CaseDetail>("/api/cases", {
      method: "POST",
      body: form,
    });
  },

  predict: (caseId: string) =>
    request<PredictionResult>(`/api/cases/${caseId}/predict`, { method: "POST" }),

  // Keep viewer URLs extensionless. Some browser download managers intercept `.nii.gz`
  // URLs before NiiVue can fetch them. NiiVue receives an explicit NIfTI filename from
  // the viewer component, so format detection remains reliable.
  volumeUrl: (caseId: string, modality: string) =>
    `${API_BASE}/api/cases/${caseId}/volume/${modality}`,

  segmentationUrl: (caseId: string) => `${API_BASE}/api/cases/${caseId}/segmentation`,

  reportUrl: (caseId: string) => `${API_BASE}/api/cases/${caseId}/report.pdf`,

  deleteCase: (caseId: string) =>
    request<{ ok: boolean }>(`/api/cases/${caseId}`, { method: "DELETE" }),
};
