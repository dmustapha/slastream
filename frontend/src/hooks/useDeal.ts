"use client";

import { useState, useEffect, useCallback } from "react";
import { getDeal } from "@/lib/starknet";
import type { Deal } from "@/lib/types";

interface UseDealReturn {
  deal: Deal | null;
  loading: boolean;
  error: string | null;
}

export function useDeal(dealId: number | null): UseDealReturn {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear stale data immediately when dealId changes
  useEffect(() => {
    setDeal(null);
    setLoading(dealId !== null);
    setError(null);
  }, [dealId]);

  const fetchDeal = useCallback(async () => {
    if (dealId === null) return;
    try {
      setLoading(true);
      const result = await getDeal(dealId);
      setDeal(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch deal");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId === null) return;
    fetchDeal();
    const interval = setInterval(fetchDeal, 15_000);
    return () => clearInterval(interval);
  }, [fetchDeal, dealId]);

  return { deal, loading, error };
}
