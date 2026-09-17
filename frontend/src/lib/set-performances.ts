export interface SavedSet {
  id: string;
  exercise: string;
  weight: string;
  reps: number;
  rir: string;
  created_at: string;
}

export async function requestSet(url: string, values?: { exercise: string; weight: string; reps: number; rir: string }, signal?: AbortSignal): Promise<SavedSet | null> {
  const response = await fetch(url, {
    method: values ? "POST" : "GET",
    ...(values ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) } : {}),
    cache: "no-store", credentials: "omit", signal,
  });
  if (!values && response.status === 404) return null;
  if (!response.ok) throw new Error(`Request failed (HTTP ${response.status}). Check the backend and database configuration.`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null ||
      !("id" in data) || typeof data.id !== "string" ||
      !("exercise" in data) || typeof data.exercise !== "string" ||
      !("weight" in data) || typeof data.weight !== "string" ||
      !("reps" in data) || typeof data.reps !== "number" ||
      !("rir" in data) || typeof data.rir !== "string" ||
      !("created_at" in data) || typeof data.created_at !== "string") {
    throw new Error("Unexpected set response.");
  }
  return data as SavedSet;
}
