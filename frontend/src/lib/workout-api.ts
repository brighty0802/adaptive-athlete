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

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const base = getBackendBaseUrl(window.location.origin);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}/api${path}`, {
      method, signal: controller.signal, cache: "no-store", credentials: "omit",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      // Do not echo arbitrary server errors or infrastructure details into the UI.
      throw new ApiError(response.status, response.status === 409
        ? "This workout changed on another device. Your unsaved draft has been kept."
        : response.status === 422 ? "The server could not accept these entries. Check the set values, then retry."
        : "The backend could not save or load your workout. Check your connection and retry.");
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Could not reach the backend. Check your connection and retry. Your pending entries are kept in this browser.");
  } finally { clearTimeout(timeout); }
}

export const workoutApi = {
  today: () => request<TodayResponse>("/today"),
  history: () => request<PersistedSession[]>("/sessions"),
  session: (id: string) => request<PersistedSession>(`/sessions/${id}`),
  start: (id: string, workoutId: WorkoutId) => request<PersistedSession>("/sessions", "POST", { id, workoutId }),
  save: (id: string, mutation: SaveMutation) => request<PersistedSession>(`/sessions/${id}`, "PUT", mutation),
  finish: (id: string, revision: number, mutationId: string) => request<PersistedSession>(`/sessions/${id}/finish`, "POST", { revision, mutationId }),
};
