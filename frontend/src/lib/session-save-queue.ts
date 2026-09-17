import type { ExerciseLog, PersistedSession } from "../types/workout";
import type { SaveMutation } from "./workout-api";

export const DRAFT_KEY = "adaptive-athlete.workout-draft.v1";
export interface DraftRecord {
  version: 1;
  sessionId: string;
  baseRevision: number;
  exercises: ExerciseLog[];
  pending: SaveMutation | null;
}
export type SaveStatus = "saved" | "pending" | "saving" | "error" | "conflict";
export interface SaveView {
  session: PersistedSession;
  savedExercises: ExerciseLog[];
  status: SaveStatus;
  error: string;
  backupWarning: boolean;
}
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function readDraft(storage: Storage): DraftRecord | null {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const draft: unknown = JSON.parse(raw);
  if (typeof draft !== "object" || draft === null || !("version" in draft) || draft.version !== 1 ||
      !("sessionId" in draft) || typeof draft.sessionId !== "string" || !("exercises" in draft) || !Array.isArray(draft.exercises) ||
      !("baseRevision" in draft) || typeof draft.baseRevision !== "number" || !("pending" in draft)) {
    throw new Error("The saved browser draft could not be read. Keep a copy before clearing it.");
  }
  return draft as DraftRecord;
}

/** A single in-flight write, with a durable draft and exact retry of ambiguous requests. */
export class SessionSaveQueue {
  private remote: PersistedSession;
  private exercises: ExerciseLog[];
  private pending: SaveMutation | null = null;
  private status: SaveStatus = "saved";
  private error = "";
  private backupWarning = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private disposed = false;
  constructor(
    remote: PersistedSession,
    private storage: Storage,
    private save: (id: string, request: SaveMutation) => Promise<PersistedSession>,
    private id: () => string,
    private notify: (view: SaveView) => void,
    draft: DraftRecord | null = null,
    private debounceMs = 600,
  ) {
    this.remote = remote;
    this.exercises = remote.exercises;
    if (draft && draft.sessionId === remote.id) {
      this.exercises = draft.exercises;
      this.pending = draft.pending;
      const acknowledged = this.pending && remote.lastMutationId === this.pending.mutationId;
      if (acknowledged) this.pending = null;
      if (!acknowledged && draft.baseRevision !== remote.revision && !equal(draft.exercises, remote.exercises)) {
        this.status = "conflict";
        this.error = "This workout changed elsewhere while this browser had unsaved entries. Download your draft, then use the saved version to continue.";
      } else if (!equal(this.exercises, remote.exercises) || this.pending) this.status = "pending";
      if (this.status === "saved") this.persist();
    }
  }
  view(): SaveView {
    return { session: { ...this.remote, exercises: this.exercises }, savedExercises: this.remote.exercises,
      status: this.status, error: this.error, backupWarning: this.backupWarning };
  }
  private emit() { if (!this.disposed) this.notify(this.view()); }
  private persist() {
    try {
      if (this.status === "saved") this.storage.removeItem(DRAFT_KEY);
      else this.storage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, sessionId: this.remote.id,
        baseRevision: this.remote.revision, exercises: this.exercises, pending: this.pending } satisfies DraftRecord));
      this.backupWarning = false;
    } catch { this.backupWarning = true; }
  }
  edit(exercises: ExerciseLog[]) {
    if (this.disposed || this.status === "conflict") return;
    this.exercises = exercises;
    if (this.status !== "error") this.status = "pending";
    this.persist(); this.emit();
    clearTimeout(this.timer);
    if (this.status !== "error") this.timer = setTimeout(() => { void this.flush(); }, this.debounceMs);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running || this.disposed || this.status === "conflict") return;
    if (!this.pending && equal(this.exercises, this.remote.exercises)) {
      this.status = "saved"; this.error = ""; this.persist(); this.emit(); return;
    }
    this.running = true;
    this.pending ??= { revision: this.remote.revision, mutationId: this.id(), exercises: this.exercises };
    this.status = "saving"; this.error = ""; this.persist(); this.emit();
    try {
      const remote = await this.save(this.remote.id, this.pending);
      this.remote = remote;
      this.pending = null;
      this.status = equal(this.exercises, remote.exercises) ? "saved" : "pending";
      this.persist(); this.emit();
    } catch (error) {
      // A 422 is a definitive rejection, so corrected entries need a new request.
      // Network failures remain ambiguous and must retry the original mutation.
      if (error instanceof Error && "status" in error && error.status === 422) this.pending = null;
      this.status = error instanceof Error && "status" in error && error.status === 409 ? "conflict" : "error";
      this.error = error instanceof Error ? error.message : "Save failed. Your draft is kept. Retry when connected.";
      this.persist(); this.emit();
    } finally { this.running = false; }
    if (this.status === "pending" && !this.disposed) await this.flush();
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
