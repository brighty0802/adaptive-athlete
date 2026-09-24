"use client";

import { useSyncExternalStore } from "react";
import { backendIsWaking, subscribeBackendWait } from "@/lib/workout-api";

export function BackendWait() {
  const waking = useSyncExternalStore(subscribeBackendWait, backendIsWaking, () => false);
  if (!waking) return null;
  return <aside className="panel sync-panel" role="status">
    <strong>Waking backend…</strong>
    <p>The server may be waking from sleep or responding slowly. This can take about a minute. Keep this page open; your entries are not marked saved until confirmed.</p>
  </aside>;
}
