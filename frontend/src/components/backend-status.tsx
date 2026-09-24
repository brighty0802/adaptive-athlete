"use client";

import { useEffect, useState } from "react";
import { fetchBackendHealth, getHealthUrl } from "@/lib/backend-health";
import { BACKEND_TIMEOUT_MS } from "@/lib/workout-api";

export function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "waking" | "connected" | "unavailable">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
    const wakeNotice = window.setTimeout(() => { if (!cancelled) setStatus("waking"); }, 4000);

    async function check() {
      try {
        const url = getHealthUrl(window.location.origin);
        await fetchBackendHealth(url, controller.signal);
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("unavailable");
      } finally {
        window.clearTimeout(timeout);
        window.clearTimeout(wakeNotice);
      }
    }
    void check();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearTimeout(wakeNotice);
      controller.abort();
    };
  }, [attempt]);

  return (
    <aside className="backend-status" aria-label="Backend connection">
      <p role="status">
        {status === "checking" && "Checking backend connection…"}
        {status === "waking" && "Waking backend… this can take about a minute."}
        {status === "connected" && "Backend connected"}
        {status === "unavailable" && "Backend unavailable — keep pending entries open and retry when connected."}
      </p>
      <button type="button" className="text-button" disabled={status === "checking" || status === "waking"} onClick={() => {
        setStatus("checking");
        setAttempt((current) => current + 1);
      }}>Check again</button>
    </aside>
  );
}
