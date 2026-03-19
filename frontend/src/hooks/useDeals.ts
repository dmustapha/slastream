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
      console.log("[SLAStream] Deal counter:", counter);
      if (counter === 0) {
        setDeals([]);
        setError(null);
        setLoading(false);
        return;
      }
      const results: DealWithId[] = [];
      for (let i = 1; i <= counter; i++) {
        try {
          const deal = await getDeal(i);
          console.log(`[SLAStream] Deal #${i}: client=${deal.client}, sp=${deal.sp}, active=${deal.is_active}`);
          results.push({ ...deal, dealId: i });
        } catch (e) {
          console.warn(`[SLAStream] Failed to fetch deal #${i}:`, e);
        }
      }
      setDeals(results);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch deals";
      console.error("[SLAStream] fetchDeals error:", msg);
      setError(msg);
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
