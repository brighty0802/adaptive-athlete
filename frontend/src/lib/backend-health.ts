export interface HealthResponse {
  status: "ok";
}

// This is the single configuration boundary for every browser-to-FastAPI call.
export function getBackendBaseUrl(
  browserOrigin: string,
  configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  environment = process.env.NODE_ENV,
): string {
  const base = configuredBaseUrl?.trim();
  const securePage = new URL(browserOrigin).protocol === "https:";
  if (!base && (environment === "production" || securePage)) {
    throw new Error("Configure NEXT_PUBLIC_API_BASE_URL with the HTTPS backend address and rebuild the frontend.");
  }
  let url: URL;
  try { url = new URL(base || browserOrigin); }
  catch { throw new Error("Invalid public backend URL configuration."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Backend URL must be an HTTP(S) address without credentials, query or fragment.");
  }
  if ((environment === "production" || securePage) && url.protocol !== "https:") {
    throw new Error("The production backend URL must use HTTPS.");
  }
  // On a phone, localhost means the phone. Preserve the page host for LAN dev.
  if (!base) url.port = "8000";
  return url.href.replace(/\/+$/, "");
}

export function getHealthUrl(browserOrigin: string, configuredBaseUrl?: string): string {
  return `${getBackendBaseUrl(browserOrigin, configuredBaseUrl)}/health`;
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
