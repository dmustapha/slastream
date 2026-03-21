"use client";

import { useState, useEffect, useRef } from "react";
import type { ChunkReleasedEvent } from "@/lib/types";
import { getChunkReleasedEvents } from "@/lib/starknet";

export function useProofEvents(dealId: number | null): {
  events: ChunkReleasedEvent[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
} {
  const [events, setEvents] = useState<ChunkReleasedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const result = await getChunkReleasedEvents(dealId);
        if (!cancelled) {
          setEvents(result);
          setError(null);
          setLoading(false);
          setLastFetchedAt(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch events",
          );
          setLoading(false);
        }
      }
    }

    fetchEvents();
    intervalRef.current = setInterval(fetchEvents, 15_000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dealId]);

  return { events, loading, error, lastFetchedAt };
}
