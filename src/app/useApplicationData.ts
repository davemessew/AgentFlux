import { useCallback, useEffect, useState } from "react";
import type { Bootstrap, Run } from "../../shared/domain";
import { api, errorMessage } from "../lib/api";

export function useApplicationData() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loadError, setLoadError] = useState("");
  const [connected, setConnected] = useState(true);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const refresh = useCallback(async () => {
    const next = await api<Bootstrap>("/bootstrap");
    setData(next);
    setLoadError("");
    return next;
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setLoadError(errorMessage(cause)));
    const events = new EventSource("/api/events");
    events.onopen = () => {
      setConnected(true);
      void refresh().catch(() => {});
    };
    events.onerror = () => setConnected(false);
    events.onmessage = (message) => {
      let event: { type?: string; value?: unknown };
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      if (
        event.type === "run" &&
        event.value &&
        typeof event.value === "object" &&
        "id" in event.value &&
        "steps" in event.value
      ) {
        const run = event.value as Run;
        setData((current) =>
          current
            ? {
                ...current,
                runs: [
                  run,
                  ...current.runs.filter((item) => item.id !== run.id),
                ].slice(0, 30),
              }
            : current,
        );
        setSelectedRun((current) => (current?.id === run.id ? run : current));
        if (run.status !== "running") void refresh().catch(() => {});
      } else if (
        [
          "records",
          "agent",
          "skill",
          "learning",
          "agents",
          "skills",
          "learnings",
        ].includes(event.type || "")
      )
        void refresh().catch(() => {});
    };
    return () => events.close();
  }, [refresh]);
  return { data, refresh, loadError, connected, selectedRun, setSelectedRun };
}
