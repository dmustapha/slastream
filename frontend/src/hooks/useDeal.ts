"use client";

import { useState, useEffect, useCallback } from "react";
import { getDeal } from "@/lib/starknet";
import type { Deal } from "@/lib/types";

interface UseDealReturn {
  deal: Deal | null;
  loading: boolean;
  error: string | null;
}

export function useDeal(dealId: number): UseDealReturn {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeal = useCallback(async () => {
    try {
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
    fetchDeal();
    const interval = setInterval(fetchDeal, 15_000);
    return () => clearInterval(interval);
  }, [fetchDeal]);

  return { deal, loading, error };
}
