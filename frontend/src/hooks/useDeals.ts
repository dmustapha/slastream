"use client";

import { useState, useEffect, useCallback } from "react";
import { getDealCounter, getDeal } from "@/lib/starknet";
import type { DealWithId } from "@/lib/types";

interface UseDealsReturn {
  deals: DealWithId[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDeals(): UseDealsReturn {
  const [deals, setDeals] = useState<DealWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      const counter = await getDealCounter();
      if (counter === 0) {
        setDeals([]);
        setError(null);
        setLoading(false);
        return;
      }
      const results = await Promise.all(
        Array.from({ length: counter }, (_, i) =>
          getDeal(i + 1).then((deal) => ({ ...deal, dealId: i + 1 })),
        ),
      );
      setDeals(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch deals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    const interval = setInterval(fetchDeals, 30_000);
    return () => clearInterval(interval);
  }, [fetchDeals]);

  return { deals, loading, error, refetch: fetchDeals };
}
