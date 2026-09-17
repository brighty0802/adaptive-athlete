export interface HealthResponse {
  status: "ok";
}

export function getHealthUrl(browserOrigin: string, configuredBaseUrl?: string): string {
  // On a phone, localhost means the phone. Default to the frontend's host instead.
  const base = configuredBaseUrl?.trim();
  const url = new URL(base || browserOrigin);
  if (!base) url.port = "8000";
  return `${url.href.replace(/\/$/, "")}/health`;
}

export async function fetchBackendHealth(url: string, signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(url, { signal, cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error(`Health request failed: HTTP ${response.status}`);
  const data: unknown = await response.json();
  // TypeScript alone cannot validate JSON received from another process.
  if (typeof data !== "object" || data === null || !("status" in data) || data.status !== "ok") {
    throw new Error("Unexpected health response");
  }
  return { status: data.status };
}
