import type { ExerciseLog, PersistedSession, TodayResponse, WorkoutId } from "../types/workout";
import { getBackendBaseUrl } from "./backend-health";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// getRandomValues also works on a phone's HTTP LAN origin; randomUUID may not.
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface SaveMutation { revision: number; mutationId: string; exercises: ExerciseLog[] }

export const BACKEND_TIMEOUT_MS = 90000;
let waitingRequests = 0;
const waitListeners = new Set<() => void>();
export const backendIsWaking = () => waitingRequests > 0;
export function subscribeBackendWait(listener: () => void) {
  waitListeners.add(listener);
  return () => { waitListeners.delete(listener); };
}
function notifyWait() { waitListeners.forEach((listener) => listener()); }

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const base = getBackendBaseUrl(window.location.origin);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  let waiting = false;
  const wakeNotice = setTimeout(() => { waiting = true; waitingRequests++; notifyWait(); }, 4000);
  try {
    const options: RequestInit = {
      method, signal: controller.signal, cache: "no-store", credentials: "omit",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    };
    let response = await fetch(`${base}/api${path}`, options);
    // Retry only reads on temporary gateway failures, within the same deadline.
    // Writes stay under the existing mutation-ID and explicit retry controls.
    while (method === "GET" && [502, 503, 504].includes(response.status) && !controller.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (controller.signal.aborted) throw new Error("Backend wake-up timed out");
      response = await fetch(`${base}/api${path}`, options);
    }
    if (!response.ok) {
      // Do not echo arbitrary server errors or infrastructure details into the UI.
      throw new ApiError(response.status, path.endsWith("/correction") && response.status === 409
        ? "Correction unavailable or this workout changed. Only the latest finished workout within seven days can be corrected, before another starts. Reload its saved version."
        : path.endsWith("/correction") && response.status === 422
        ? "Check the corrected values and keep at least one set marked complete."
        : response.status === 409
        ? "This workout changed on another device. Your unsaved draft has been kept."
        : response.status === 422 ? "The server could not accept these entries. Check the set values, then retry."
        : "The backend could not save or load your workout. Check your connection and retry.");
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Could not reach the backend. It may still be waking up; please retry. Keep this page open to retain pending entries.");
  } finally {
    clearTimeout(timeout); clearTimeout(wakeNotice);
    if (waiting) { waitingRequests--; notifyWait(); }
  }
}

export const workoutApi = {
  today: () => request<TodayResponse>("/today"),
  history: () => request<PersistedSession[]>("/sessions"),
  session: (id: string) => request<PersistedSession>(`/sessions/${id}`),
  start: (id: string, workoutId: WorkoutId) => request<PersistedSession>("/sessions", "POST", { id, workoutId }),
  save: (id: string, mutation: SaveMutation) => request<PersistedSession>(`/sessions/${id}`, "PUT", mutation),
  correct: (id: string, mutation: SaveMutation) => request<PersistedSession>(`/sessions/${id}/correction`, "PUT", mutation),
  finish: (id: string, revision: number, mutationId: string) => request<PersistedSession>(`/sessions/${id}/finish`, "POST", { revision, mutationId }),
};
