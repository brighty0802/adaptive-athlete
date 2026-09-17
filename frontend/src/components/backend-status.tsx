"use client";

import { useEffect, useState } from "react";
import { fetchBackendHealth, getHealthUrl } from "@/lib/backend-health";

export function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "unavailable">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    async function check() {
      try {
        const url = getHealthUrl(window.location.origin);
        await fetchBackendHealth(url, controller.signal);
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("unavailable");
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void check();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <aside className="backend-status" aria-label="Backend connection">
      <p role="status">
        {status === "checking" && "Checking backend connection…"}
        {status === "connected" && "Backend connected"}
        {status === "unavailable" && "Backend unavailable — keep pending entries open and retry when connected."}
      </p>
      <button type="button" className="text-button" disabled={status === "checking"} onClick={() => {
        setStatus("checking");
        setAttempt((current) => current + 1);
      }}>Check again</button>
    </aside>
  );
}
